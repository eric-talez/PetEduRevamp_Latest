import express from 'express';
import { db } from '../db';
import { 
  pushCampaigns, 
  scheduledPushNotifications, 
  pushNotificationLogs,
  fcmTokens,
  users,
  pets,
  insertPushCampaignSchema
} from '../../shared/schema';
import { eq, and, inArray, sql, gte, lte, isNull } from 'drizzle-orm';
import { fcmService } from '../services/fcm-service';
import { logServerError } from '../middleware/audit-logger';

const router = express.Router();

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  }
  next();
}

router.use(requireAdmin);

/**
 * POST /api/admin/push/campaigns
 * 푸시 캠페인 생성
 */
router.post('/campaigns', async (req, res) => {
  try {
    const validation = insertPushCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: '잘못된 요청', 
        details: validation.error.errors 
      });
    }

    const { title, message, targetType, targetCriteria, scheduledAt, data, status } = validation.data;

    const [campaign] = await db.insert(pushCampaigns).values({
      title,
      message,
      targetType,
      targetCriteria: targetCriteria || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      data: data || null,
      status: scheduledAt ? 'scheduled' : (status || 'draft'),
      createdBy: req.user!.id,
    }).returning();

    console.log(`[Push Admin] 캠페인 생성됨: ${campaign.id} - ${title}`);

    res.status(201).json({ 
      message: '캠페인이 생성되었습니다',
      campaign 
    });
  } catch (error) {
    logServerError('[Push Admin] 캠페인 생성 실패:', error, req);
    res.status(500).json({ error: '캠페인 생성에 실패했습니다' });
  }
});

/**
 * GET /api/admin/push/campaigns
 * 캠페인 목록 조회
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select().from(pushCampaigns);

    if (status && typeof status === 'string') {
      query = query.where(eq(pushCampaigns.status, status)) as any;
    }

    const campaigns = await query
      .orderBy(sql`${pushCampaigns.createdAt} DESC`)
      .limit(Number(limit))
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pushCampaigns);

    res.json({
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.count),
      }
    });
  } catch (error) {
    logServerError('[Push Admin] 캠페인 목록 조회 실패:', error, req);
    res.status(500).json({ error: '캠페인 목록 조회에 실패했습니다' });
  }
});

/**
 * GET /api/admin/push/campaigns/:id
 * 캠페인 상세 조회
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [campaign] = await db
      .select()
      .from(pushCampaigns)
      .where(eq(pushCampaigns.id, Number(id)));

    if (!campaign) {
      return res.status(404).json({ error: '캠페인을 찾을 수 없습니다' });
    }

    const logs = await db
      .select()
      .from(pushNotificationLogs)
      .where(eq(pushNotificationLogs.campaignId, Number(id)))
      .limit(100);

    res.json({ campaign, logs });
  } catch (error) {
    logServerError('[Push Admin] 캠페인 상세 조회 실패:', error, req);
    res.status(500).json({ error: '캠페인 조회에 실패했습니다' });
  }
});

/**
 * POST /api/admin/push/campaigns/:id/send
 * 캠페인 즉시 발송
 */
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    const [campaign] = await db
      .select()
      .from(pushCampaigns)
      .where(eq(pushCampaigns.id, Number(id)));

    if (!campaign) {
      return res.status(404).json({ error: '캠페인을 찾을 수 없습니다' });
    }

    if (campaign.status === 'completed' || campaign.status === 'sending') {
      return res.status(400).json({ error: '이미 발송 중이거나 완료된 캠페인입니다' });
    }

    await db
      .update(pushCampaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(pushCampaigns.id, Number(id)));

    const targetTokens = await getTargetTokens(campaign.targetType, campaign.targetCriteria as any);

    if (targetTokens.length === 0) {
      await db
        .update(pushCampaigns)
        .set({ 
          status: 'completed',
          sentAt: new Date(),
          totalRecipients: 0,
          updatedAt: new Date()
        })
        .where(eq(pushCampaigns.id, Number(id)));

      return res.json({ 
        message: '발송 대상이 없습니다',
        stats: { total: 0, success: 0, failure: 0 }
      });
    }

    sendCampaignAsync(Number(id), campaign.title, campaign.message, targetTokens, campaign.data as any);

    res.json({ 
      message: '발송이 시작되었습니다',
      totalRecipients: targetTokens.length
    });
  } catch (error) {
    logServerError('[Push Admin] 캠페인 발송 실패:', error, req);
    res.status(500).json({ error: '캠페인 발송에 실패했습니다' });
  }
});

/**
 * POST /api/admin/push/send-now
 * 즉시 푸시 발송 (캠페인 생성 없이)
 */
router.post('/send-now', async (req, res) => {
  try {
    const { title, message, targetType, targetCriteria, data } = req.body;

    if (!title || !message || !targetType) {
      return res.status(400).json({ error: '제목, 메시지, 대상 유형은 필수입니다' });
    }

    const [campaign] = await db.insert(pushCampaigns).values({
      title,
      message,
      targetType,
      targetCriteria: targetCriteria || null,
      data: data || null,
      status: 'sending',
      createdBy: req.user!.id,
    }).returning();

    const targetTokens = await getTargetTokens(targetType, targetCriteria);

    if (targetTokens.length === 0) {
      await db
        .update(pushCampaigns)
        .set({ 
          status: 'completed',
          sentAt: new Date(),
          totalRecipients: 0,
          updatedAt: new Date()
        })
        .where(eq(pushCampaigns.id, campaign.id));

      return res.json({ 
        message: '발송 대상이 없습니다',
        campaignId: campaign.id,
        stats: { total: 0, success: 0, failure: 0 }
      });
    }

    sendCampaignAsync(campaign.id, title, message, targetTokens, data);

    res.json({ 
      message: '발송이 시작되었습니다',
      campaignId: campaign.id,
      totalRecipients: targetTokens.length
    });
  } catch (error) {
    logServerError('[Push Admin] 즉시 발송 실패:', error, req);
    res.status(500).json({ error: '즉시 발송에 실패했습니다' });
  }
});

/**
 * GET /api/admin/push/segments
 * 세그먼트 옵션 조회 (역할, 펫 유형 등)
 */
router.get('/segments', async (req, res) => {
  try {
    const [userStats] = await db
      .select({
        petOwners: sql<number>`count(*) filter (where role = 'pet-owner')`,
        trainers: sql<number>`count(*) filter (where role = 'trainer')`,
        instituteAdmins: sql<number>`count(*) filter (where role = 'institute-admin')`,
        total: sql<number>`count(*)`
      })
      .from(users)
      .where(eq(users.isActive, true));

    const petTypes = await db
      .select({
        species: pets.species,
        count: sql<number>`count(*)`
      })
      .from(pets)
      .groupBy(pets.species);

    const [tokenStats] = await db
      .select({
        web: sql<number>`count(*) filter (where device_type = 'web')`,
        android: sql<number>`count(*) filter (where device_type = 'android')`,
        ios: sql<number>`count(*) filter (where device_type = 'ios')`,
        total: sql<number>`count(*)`
      })
      .from(fcmTokens)
      .where(eq(fcmTokens.isActive, true));

    res.json({
      roles: [
        { value: 'pet-owner', label: '반려인', count: Number(userStats.petOwners) },
        { value: 'trainer', label: '훈련사', count: Number(userStats.trainers) },
        { value: 'institute-admin', label: '기관 관리자', count: Number(userStats.instituteAdmins) },
      ],
      petTypes: petTypes.map(pt => ({
        value: pt.species,
        label: pt.species,
        count: Number(pt.count)
      })),
      devices: {
        web: Number(tokenStats.web),
        android: Number(tokenStats.android),
        ios: Number(tokenStats.ios),
        total: Number(tokenStats.total)
      }
    });
  } catch (error) {
    logServerError('[Push Admin] 세그먼트 조회 실패:', error, req);
    res.status(500).json({ error: '세그먼트 조회에 실패했습니다' });
  }
});

/**
 * DELETE /api/admin/push/campaigns/:id
 * 캠페인 삭제
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [campaign] = await db
      .select()
      .from(pushCampaigns)
      .where(eq(pushCampaigns.id, Number(id)));

    if (!campaign) {
      return res.status(404).json({ error: '캠페인을 찾을 수 없습니다' });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({ error: '발송 중인 캠페인은 삭제할 수 없습니다' });
    }

    await db.delete(pushNotificationLogs).where(eq(pushNotificationLogs.campaignId, Number(id)));
    await db.delete(scheduledPushNotifications).where(eq(scheduledPushNotifications.campaignId, Number(id)));
    await db.delete(pushCampaigns).where(eq(pushCampaigns.id, Number(id)));

    res.json({ message: '캠페인이 삭제되었습니다' });
  } catch (error) {
    logServerError('[Push Admin] 캠페인 삭제 실패:', error, req);
    res.status(500).json({ error: '캠페인 삭제에 실패했습니다' });
  }
});

async function getTargetTokens(
  targetType: string, 
  criteria?: { role?: string; petTypes?: string[]; deviceTypes?: string[] }
): Promise<{ userId: number; tokenId: number; token: string }[]> {
  let userIds: number[] = [];

  if (targetType === 'all') {
    const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
    userIds = allUsers.map(u => u.id);
  } else if (targetType === 'role' && criteria?.role) {
    const roleUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.role, criteria.role)));
    userIds = roleUsers.map(u => u.id);
  } else if (targetType === 'segment' && criteria?.petTypes?.length) {
    const petOwners = await db
      .select({ ownerId: pets.ownerId })
      .from(pets)
      .where(inArray(pets.species, criteria.petTypes))
      .groupBy(pets.ownerId);
    userIds = petOwners.filter(p => p.ownerId !== null).map(p => p.ownerId as number);
  }

  if (userIds.length === 0) {
    return [];
  }

  let tokenQuery = db
    .select({
      userId: fcmTokens.userId,
      tokenId: fcmTokens.id,
      token: fcmTokens.token
    })
    .from(fcmTokens)
    .where(and(
      inArray(fcmTokens.userId, userIds),
      eq(fcmTokens.isActive, true)
    ));

  if (criteria?.deviceTypes?.length) {
    tokenQuery = tokenQuery.where(inArray(fcmTokens.deviceType, criteria.deviceTypes)) as any;
  }

  return await tokenQuery;
}

async function sendCampaignAsync(
  campaignId: number,
  title: string,
  message: string,
  tokens: { userId: number; tokenId: number; token: string }[],
  data?: Record<string, string>
) {
  console.log(`[Push Admin] 캠페인 ${campaignId} 비동기 발송 시작 - ${tokens.length}개 기기`);

  let successCount = 0;
  let failureCount = 0;
  const invalidTokenIds: number[] = [];

  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const tokenStrings = batch.map(t => t.token);

    const result = await fcmService.sendToMultipleDevices(tokenStrings, title, message, data);
    successCount += result.successCount;
    failureCount += result.failureCount;

    for (const invalidToken of result.invalidTokens) {
      const found = batch.find(t => t.token === invalidToken);
      if (found) {
        invalidTokenIds.push(found.tokenId);
      }
    }

    for (const t of batch) {
      const isSuccess = !result.invalidTokens.includes(t.token);
      await db.insert(pushNotificationLogs).values({
        campaignId,
        userId: t.userId,
        tokenId: t.tokenId,
        title,
        message,
        status: isSuccess ? 'success' : 'failed',
        errorMessage: isSuccess ? null : 'Token invalid or unregistered'
      });
    }
  }

  if (invalidTokenIds.length > 0) {
    await db
      .update(fcmTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(fcmTokens.id, invalidTokenIds));
  }

  await db
    .update(pushCampaigns)
    .set({
      status: 'completed',
      sentAt: new Date(),
      totalRecipients: tokens.length,
      successCount,
      failureCount,
      updatedAt: new Date()
    })
    .where(eq(pushCampaigns.id, campaignId));

  console.log(`[Push Admin] 캠페인 ${campaignId} 발송 완료 - 성공: ${successCount}, 실패: ${failureCount}`);
}

export default router;
