import { Router } from 'express';
import { db } from '../db';
import { 
  engagementEvents, 
  talezScoreCache, 
  monthlyRevenue, 
  payouts, 
  follows,
  monetizationSettings,
  users,
  courses
} from '../../shared/schema';
import { eq, sql, and, desc, count } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// ==================== 점수 계산 함수 ====================

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

// 견주(Owner) 점수 계산
function calcOwnerScore({ watchSeconds, comments, accepted, visits }: {
  watchSeconds: number;
  comments: number;
  accepted: number;
  visits: number;
}): number {
  const watchHours = watchSeconds / 3600;
  return (
    watchHours * 0.4 +
    comments * 0.2 +
    accepted * 0.2 +
    visits * 0.2
  );
}

// 훈련사(Trainer) 점수 계산
function calcTrainerScore({ views, watchSeconds, likes, acceptedOnTrainer }: {
  views: number;
  watchSeconds: number;
  likes: number;
  acceptedOnTrainer: number;
}): number {
  const v = Math.max(views, 1);
  
  const avgWatch = watchSeconds / v;
  const completion = clamp(avgWatch / 60, 0, 1);
  const likeRate = clamp(likes / v, 0, 1);
  
  const viewsTerm = Math.log10(1 + views) * 10;
  const completionTerm = completion * 30;
  const likeTerm = likeRate * 20;
  const acceptedTerm = acceptedOnTrainer * 5;
  
  return (
    viewsTerm * 0.3 +
    completionTerm * 0.3 +
    likeTerm * 0.2 +
    acceptedTerm * 0.2
  );
}

// 수익화 자격 확인
function checkMonetizationEligibility(followers: number, score: number, violations: number) {
  const canAds = (followers >= 300 || score >= 20) && violations === 0;
  const canPaid = followers >= 1000 && score >= 80 && violations === 0;
  
  let level = 0;
  if (canPaid) level = 2;
  else if (canAds) level = 1;
  
  return { canAds, canPaid, level };
}

// 매출 단계 결정
function getRevenueStage(totalAmount: number): { stage: string; stageNumber: number; platformShare: number; trainerShare: number } {
  if (totalAmount < 5000000) {
    return { stage: 'stage1', stageNumber: 1, platformShare: 60, trainerShare: 40 };
  } else if (totalAmount < 15000000) {
    return { stage: 'stage2', stageNumber: 2, platformShare: 50, trainerShare: 50 };
  } else {
    return { stage: 'stage3', stageNumber: 3, platformShare: 40, trainerShare: 60 };
  }
}

// ==================== 이벤트 API ====================

// 이벤트 기록 (조회, 시청, 좋아요 등)
router.post('/events', async (req, res) => {
  try {
    const { userId, targetType, targetId, eventType, value } = req.body;
    
    if (!userId || !targetType || !eventType) {
      return res.status(400).json({ error: 'userId, targetType, eventType are required' });
    }
    
    const eventValue = value ?? 1;
    
    await db.insert(engagementEvents).values({
      userId,
      targetType,
      targetId: targetId || null,
      eventType,
      value: String(eventValue),
    });
    
    // 점수 재계산
    await recalcUserScore(userId);
    
    // 타겟이 video나 course면 해당 훈련사 점수도 재계산
    if ((targetType === 'video' || targetType === 'course') && targetId) {
      const course = await db.select().from(courses).where(eq(courses.id, targetId)).limit(1);
      if (course.length > 0 && course[0].instructorId) {
        await recalcUserScore(course[0].instructorId);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    logServerError('Event record error:', error, req);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// 사용자 점수 재계산
async function recalcUserScore(userId: number) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;
    
    // 팔로워 수 계산
    const [followerResult] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    const followerCount = followerResult?.count || 0;
    
    let ownerScore = 0;
    let trainerScore = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalWatchSeconds = 0;
    
    if (user.role === 'pet-owner') {
      // 견주 점수 계산
      const [watchResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(CAST(value AS DECIMAL)), 0)` })
        .from(engagementEvents)
        .where(and(eq(engagementEvents.userId, userId), eq(engagementEvents.eventType, 'watch')));
      
      const [commentResult] = await db
        .select({ count: count() })
        .from(engagementEvents)
        .where(and(eq(engagementEvents.userId, userId), eq(engagementEvents.eventType, 'comment')));
      
      const [acceptedResult] = await db
        .select({ count: count() })
        .from(engagementEvents)
        .where(and(eq(engagementEvents.userId, userId), eq(engagementEvents.eventType, 'answer_accepted')));
      
      const [visitResult] = await db
        .select({ count: count() })
        .from(engagementEvents)
        .where(and(eq(engagementEvents.userId, userId), eq(engagementEvents.eventType, 'visit_store')));
      
      totalWatchSeconds = Number(watchResult?.total || 0);
      totalComments = commentResult?.count || 0;
      
      ownerScore = calcOwnerScore({
        watchSeconds: totalWatchSeconds,
        comments: totalComments,
        accepted: acceptedResult?.count || 0,
        visits: visitResult?.count || 0,
      });
    } else if (user.role === 'trainer') {
      // 훈련사 점수 계산 - 자신의 강좌에 대한 이벤트
      const trainerCourses = await db.select({ id: courses.id }).from(courses).where(eq(courses.instructorId, userId));
      const courseIds = trainerCourses.map(c => c.id);
      
      if (courseIds.length > 0) {
        const [viewsResult] = await db
          .select({ count: count() })
          .from(engagementEvents)
          .where(and(
            eq(engagementEvents.targetType, 'course'),
            eq(engagementEvents.eventType, 'view'),
            sql`${engagementEvents.targetId} = ANY(${courseIds})`
          ));
        
        const [watchResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(CAST(value AS DECIMAL)), 0)` })
          .from(engagementEvents)
          .where(and(
            eq(engagementEvents.targetType, 'course'),
            eq(engagementEvents.eventType, 'watch'),
            sql`${engagementEvents.targetId} = ANY(${courseIds})`
          ));
        
        const [likesResult] = await db
          .select({ count: count() })
          .from(engagementEvents)
          .where(and(
            eq(engagementEvents.targetType, 'course'),
            eq(engagementEvents.eventType, 'like'),
            sql`${engagementEvents.targetId} = ANY(${courseIds})`
          ));
        
        const [acceptedResult] = await db
          .select({ count: count() })
          .from(engagementEvents)
          .where(and(
            eq(engagementEvents.targetType, 'trainer'),
            eq(engagementEvents.targetId, userId),
            eq(engagementEvents.eventType, 'answer_accepted')
          ));
        
        totalViews = viewsResult?.count || 0;
        totalWatchSeconds = Number(watchResult?.total || 0);
        totalLikes = likesResult?.count || 0;
        
        trainerScore = calcTrainerScore({
          views: totalViews,
          watchSeconds: totalWatchSeconds,
          likes: totalLikes,
          acceptedOnTrainer: acceptedResult?.count || 0,
        });
      }
    }
    
    // 기존 캐시 확인
    const [existingCache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    const violations = existingCache?.violationCount || 0;
    
    const eligibility = checkMonetizationEligibility(followerCount, Math.max(ownerScore, trainerScore), violations);
    
    if (existingCache) {
      await db.update(talezScoreCache)
        .set({
          ownerScore: String(ownerScore),
          trainerScore: String(trainerScore),
          totalWatchSeconds: String(totalWatchSeconds),
          totalViews,
          totalLikes,
          totalComments,
          followerCount,
          monetizationLevel: eligibility.level,
          lastCalculatedAt: new Date(),
        })
        .where(eq(talezScoreCache.userId, userId));
    } else {
      await db.insert(talezScoreCache).values({
        userId,
        ownerScore: String(ownerScore),
        trainerScore: String(trainerScore),
        totalWatchSeconds: String(totalWatchSeconds),
        totalViews,
        totalLikes,
        totalComments,
        followerCount,
        monetizationLevel: eligibility.level,
        monetizationEnabled: false,
        violationCount: 0,
      });
    }
    
    return { ownerScore, trainerScore, followerCount, eligibility };
  } catch (error) {
    logServerError('Score recalc error:', error);
    return null;
  }
}

// ==================== 사용자/점수 API ====================

// 사용자 점수 조회
router.get('/users/:id/score', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    await recalcUserScore(userId);
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [cache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const score = user.role === 'trainer' ? Number(cache?.trainerScore || 0) : Number(cache?.ownerScore || 0);
    const eligibility = checkMonetizationEligibility(
      cache?.followerCount || 0, 
      score, 
      cache?.violationCount || 0
    );
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      cache,
      eligibility,
    });
  } catch (error) {
    logServerError('User score fetch error:', error, req);
    res.status(500).json({ error: 'Failed to fetch user score' });
  }
});

// 팔로우
router.post('/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'followerId and followingId are required' });
    }
    
    // 중복 체크
    const [existing] = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    
    if (existing) {
      return res.status(400).json({ error: 'Already following' });
    }
    
    await db.insert(follows).values({ followerId, followingId });
    
    // 이벤트 기록
    await db.insert(engagementEvents).values({
      userId: followerId,
      targetType: 'trainer',
      targetId: followingId,
      eventType: 'follow',
      value: '1',
    });
    
    // 팔로우 대상 점수 재계산
    await recalcUserScore(followingId);
    
    res.json({ success: true });
  } catch (error) {
    logServerError('Follow error:', error, req);
    res.status(500).json({ error: 'Failed to follow' });
  }
});

// 언팔로우
router.delete('/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    
    await recalcUserScore(followingId);
    
    res.json({ success: true });
  } catch (error) {
    logServerError('Unfollow error:', error, req);
    res.status(500).json({ error: 'Failed to unfollow' });
  }
});

// ==================== 수익화 토글 (관리자) ====================

router.post('/users/:id/monetization', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { enabled } = req.body;
    
    const [existing] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    
    if (existing) {
      await db.update(talezScoreCache)
        .set({ monetizationEnabled: enabled })
        .where(eq(talezScoreCache.userId, userId));
    } else {
      await db.insert(talezScoreCache).values({
        userId,
        monetizationEnabled: enabled,
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    logServerError('Monetization toggle error:', error, req);
    res.status(500).json({ error: 'Failed to toggle monetization' });
  }
});

// ==================== 관리자 대시보드 API ====================

// 전체 사용자 점수 현황 (관리자용)
router.get('/admin/overview', async (req, res) => {
  try {
    const usersWithScores = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        email: users.email,
        ownerScore: talezScoreCache.ownerScore,
        trainerScore: talezScoreCache.trainerScore,
        totalViews: talezScoreCache.totalViews,
        totalLikes: talezScoreCache.totalLikes,
        totalComments: talezScoreCache.totalComments,
        totalWatchSeconds: talezScoreCache.totalWatchSeconds,
        followerCount: talezScoreCache.followerCount,
        violationCount: talezScoreCache.violationCount,
        monetizationLevel: talezScoreCache.monetizationLevel,
        monetizationEnabled: talezScoreCache.monetizationEnabled,
      })
      .from(users)
      .leftJoin(talezScoreCache, eq(users.id, talezScoreCache.userId))
      .where(sql`${users.role} IN ('pet-owner', 'trainer')`)
      .orderBy(desc(talezScoreCache.trainerScore));
    
    const enriched = usersWithScores.map(u => {
      const score = u.role === 'trainer' ? Number(u.trainerScore || 0) : Number(u.ownerScore || 0);
      const eligibility = checkMonetizationEligibility(
        u.followerCount || 0,
        score,
        u.violationCount || 0
      );
      return { ...u, ...eligibility };
    });
    
    // 통계
    const totalUsers = enriched.length;
    const trainersWithMonetization = enriched.filter(u => u.role === 'trainer' && u.monetizationEnabled).length;
    const canAdsCount = enriched.filter(u => u.canAds).length;
    const canPaidCount = enriched.filter(u => u.canPaid).length;
    
    res.json({
      users: enriched,
      stats: {
        totalUsers,
        trainersWithMonetization,
        canAdsCount,
        canPaidCount,
      },
    });
  } catch (error) {
    logServerError('Admin overview error:', error, req);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// 월별 매출 기록
router.post('/admin/revenue', async (req, res) => {
  try {
    const { month, totalAmount, adRevenue, subscriptionRevenue, courseRevenue, consultationRevenue, otherRevenue } = req.body;
    
    const { stage, platformShare, trainerShare } = getRevenueStage(totalAmount);
    
    const [result] = await db.insert(monthlyRevenue).values({
      month,
      totalAmount: String(totalAmount),
      adRevenue: String(adRevenue || 0),
      subscriptionRevenue: String(subscriptionRevenue || 0),
      courseRevenue: String(courseRevenue || 0),
      consultationRevenue: String(consultationRevenue || 0),
      otherRevenue: String(otherRevenue || 0),
      stage,
      platformShare: String(platformShare),
      trainerShare: String(trainerShare),
    }).returning();
    
    res.json(result);
  } catch (error) {
    logServerError('Revenue record error:', error, req);
    res.status(500).json({ error: 'Failed to record revenue' });
  }
});

// 매출 현황 조회
router.get('/admin/revenue', async (req, res) => {
  try {
    const revenues = await db.select().from(monthlyRevenue).orderBy(desc(monthlyRevenue.month)).limit(12);
    res.json(revenues);
  } catch (error) {
    logServerError('Revenue fetch error:', error, req);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

// 정산 실행
router.post('/admin/settle/:revenueId', async (req, res) => {
  try {
    const revenueId = parseInt(req.params.revenueId);
    
    const [revenue] = await db.select().from(monthlyRevenue).where(eq(monthlyRevenue.id, revenueId));
    
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue not found' });
    }
    
    if (revenue.isSettled) {
      return res.status(400).json({ error: 'Already settled' });
    }
    
    // 훈련사들의 점수 합산
    const trainers = await db
      .select({
        userId: talezScoreCache.userId,
        trainerScore: talezScoreCache.trainerScore,
      })
      .from(talezScoreCache)
      .innerJoin(users, eq(users.id, talezScoreCache.userId))
      .where(and(
        eq(users.role, 'trainer'),
        eq(talezScoreCache.monetizationEnabled, true)
      ));
    
    if (trainers.length === 0) {
      return res.status(400).json({ error: 'No eligible trainers' });
    }
    
    const totalScore = trainers.reduce((sum, t) => sum + Number(t.trainerScore || 0), 0);
    const trainerPool = Number(revenue.totalAmount) * (Number(revenue.trainerShare) / 100);
    
    const payoutResults = [];
    
    for (const trainer of trainers) {
      const score = Number(trainer.trainerScore || 0);
      const ratio = totalScore > 0 ? score / totalScore : 0;
      const grossAmount = trainerPool * ratio;
      const platformFee = grossAmount * (Number(revenue.platformShare) / 100);
      const netAmount = grossAmount - platformFee;
      
      const [payout] = await db.insert(payouts).values({
        revenueId,
        userId: trainer.userId,
        month: revenue.month,
        grossAmount: String(grossAmount),
        platformFee: String(platformFee),
        netAmount: String(netAmount),
        contributionScore: String(score),
        contributionRatio: String(ratio),
        status: 'pending',
      }).returning();
      
      payoutResults.push(payout);
    }
    
    // 매출 정산 완료 표시
    await db.update(monthlyRevenue)
      .set({ isSettled: true, settledAt: new Date() })
      .where(eq(monthlyRevenue.id, revenueId));
    
    res.json({ success: true, payouts: payoutResults });
  } catch (error) {
    logServerError('Settlement error:', error, req);
    res.status(500).json({ error: 'Failed to settle' });
  }
});

// 정산 내역 조회
router.get('/admin/payouts', async (req, res) => {
  try {
    const { month } = req.query;
    
    let query = db
      .select({
        payout: payouts,
        userName: users.name,
        userEmail: users.email,
      })
      .from(payouts)
      .innerJoin(users, eq(users.id, payouts.userId))
      .orderBy(desc(payouts.createdAt));
    
    if (month) {
      query = query.where(eq(payouts.month, month as string)) as any;
    }
    
    const results = await query.limit(100);
    
    res.json(results);
  } catch (error) {
    logServerError('Payouts fetch error:', error, req);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// ==================== 훈련사 수익 대시보드 API ====================

// 내 수익 현황
router.get('/trainer/earnings', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const [cache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    const myPayouts = await db.select().from(payouts)
      .where(eq(payouts.userId, userId))
      .orderBy(desc(payouts.month))
      .limit(12);
    
    const totalEarnings = myPayouts.reduce((sum, p) => sum + Number(p.netAmount), 0);
    
    const eligibility = checkMonetizationEligibility(
      cache?.followerCount || 0,
      Number(cache?.trainerScore || 0),
      cache?.violationCount || 0
    );
    
    res.json({
      score: cache,
      eligibility,
      payouts: myPayouts,
      totalEarnings,
    });
  } catch (error) {
    logServerError('Trainer earnings error:', error, req);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// 수익화 설정 조회
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(monetizationSettings);
    const settingsMap: Record<string, any> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    res.json(settingsMap);
  } catch (error) {
    logServerError('Settings fetch error:', error, req);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 현재 사용자의 TALEZ SCORE 조회
router.get('/my-score', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.json({
        talezScore: 0,
        followers: 0,
        totalViews: 0,
        totalLikes: 0,
        totalWatchTime: 0,
      });
    }
    
    const [cache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    const [followerResult] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    res.json({
      talezScore: Number(cache?.trainerScore || 0),
      followers: followerResult?.count || 0,
      totalViews: cache?.viewCount || 0,
      totalLikes: cache?.likeCount || 0,
      totalWatchTime: Math.floor((cache?.watchSeconds || 0) / 60),
    });
  } catch (error) {
    logServerError('My score error:', error, req);
    res.status(500).json({ error: 'Failed to fetch score' });
  }
});

// 현재 사용자의 수익화 자격 조회
router.get('/my-eligibility', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.json({
        eligibilityLevel: 0,
        revenueStage: 1,
        pendingPayout: 0,
        requirements: {
          level1: { followersNeeded: 300, scoreNeeded: 20 },
          level2: { followersNeeded: 1000, scoreNeeded: 80 },
        },
      });
    }
    
    const [cache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, userId));
    const [followerResult] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    const followers = followerResult?.count || 0;
    const score = Number(cache?.trainerScore || 0);
    const violations = cache?.violationCount || 0;
    
    const eligibility = checkMonetizationEligibility(followers, score, violations);
    
    // 미정산 금액 계산
    const pendingPayouts = await db.select()
      .from(payouts)
      .where(and(eq(payouts.userId, userId), eq(payouts.status, 'pending')));
    const pendingPayout = pendingPayouts.reduce((sum, p) => sum + Number(p.netAmount), 0);
    
    // 매출 단계 계산 (개인 기준으로는 Stage 1 기본)
    const revenueStage = eligibility.level >= 2 ? 2 : 1;
    
    res.json({
      eligibilityLevel: eligibility.level,
      revenueStage,
      pendingPayout,
      requirements: {
        level1: { 
          followersNeeded: Math.max(0, 300 - followers), 
          scoreNeeded: Math.max(0, 20 - score) 
        },
        level2: { 
          followersNeeded: Math.max(0, 1000 - followers), 
          scoreNeeded: Math.max(0, 80 - score) 
        },
      },
    });
  } catch (error) {
    logServerError('My eligibility error:', error, req);
    res.status(500).json({ error: 'Failed to fetch eligibility' });
  }
});

// 관리자: 훈련사 목록 조회 (수익화 정보 포함)
router.get('/admin/trainers', async (req, res) => {
  try {
    const trainers = await db.select().from(users).where(eq(users.role, 'trainer'));
    
    const enrichedTrainers = await Promise.all(trainers.map(async (trainer) => {
      const [cache] = await db.select().from(talezScoreCache).where(eq(talezScoreCache.userId, trainer.id));
      const [followerResult] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, trainer.id));
      
      const followers = followerResult?.count || 0;
      const score = Number(cache?.trainerScore || 0);
      const violations = cache?.violationCount || 0;
      
      const eligibility = checkMonetizationEligibility(followers, score, violations);
      
      const pendingPayouts = await db.select()
        .from(payouts)
        .where(and(eq(payouts.userId, trainer.id), eq(payouts.status, 'pending')));
      const pendingPayout = pendingPayouts.reduce((sum, p) => sum + Number(p.netAmount), 0);
      
      return {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        talezScore: score,
        followers,
        eligibilityLevel: eligibility.level,
        revenueStage: eligibility.level >= 2 ? 2 : 1,
        pendingPayout,
        totalViews: cache?.viewCount || 0,
        totalWatchTime: Math.floor((cache?.watchSeconds || 0) / 60),
        totalLikes: cache?.likeCount || 0,
        totalComments: cache?.commentCount || 0,
      };
    }));
    
    res.json({ trainers: enrichedTrainers });
  } catch (error) {
    logServerError('Admin trainers error:', error, req);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// 관리자: 월별 매출 현황 조회
router.get('/admin/revenue/monthly', async (req, res) => {
  try {
    const revenues = await db.select().from(monthlyRevenue).orderBy(desc(monthlyRevenue.month)).limit(6);
    
    const monthly = revenues.map(r => {
      const stageInfo = getRevenueStage(Number(r.totalAmount));
      return {
        month: r.month,
        totalRevenue: Number(r.totalAmount),
        platformShare: Number(r.platformShare),
        trainerShare: Number(r.trainerShare),
        stage: stageInfo.stageNumber,
        settled: r.isSettled,
        trainerCount: 0,
        stage1Count: 0,
        stage2Count: 0,
        stage3Count: 0,
      };
    });
    
    res.json({ monthly });
  } catch (error) {
    logServerError('Monthly revenue error:', error, req);
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
});

// 관리자: 정산 처리
router.post('/admin/process-payout', async (req, res) => {
  try {
    const { trainerId } = req.body;
    
    const pendingPayouts = await db.select()
      .from(payouts)
      .where(and(eq(payouts.userId, trainerId), eq(payouts.status, 'pending')));
    
    if (pendingPayouts.length === 0) {
      return res.status(400).json({ error: 'No pending payouts' });
    }
    
    for (const payout of pendingPayouts) {
      await db.update(payouts)
        .set({ status: 'completed', paidAt: new Date() })
        .where(eq(payouts.id, payout.id));
    }
    
    res.json({ success: true, processedCount: pendingPayouts.length });
  } catch (error) {
    logServerError('Process payout error:', error, req);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

// 관리자: 수익화 설정 업데이트
router.put('/admin/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await db.insert(monetizationSettings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({
          target: monetizationSettings.key,
          set: { value: String(value), updatedAt: new Date() },
        });
    }
    
    res.json({ success: true });
  } catch (error) {
    logServerError('Settings update error:', error, req);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
