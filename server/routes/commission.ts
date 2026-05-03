import { Router, type Response, type NextFunction } from 'express';
import { db } from '../db';
import { products, productCommissions, referralProfiles, referralEarnings, settlements } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { recordAuditLog, logServerError } from '../middleware/audit-logger';

function requireAdmin(req: any, res: Response, next: NextFunction) {
  const user = req.user || req.session?.user;
  if (!user) return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
  }
  next();
}

export const commissionRoutes = Router();
commissionRoutes.use(requireAdmin);

/**
 * GET /api/commission/products
 * 상품별 수수료율 조회
 */
commissionRoutes.get('/products', async (req, res) => {
  try {
    console.log('[Commission] 상품별 수수료율 조회 요청');
    
    // 상품 목록과 수수료율 조인하여 조회
    const productsWithCommission = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category_id,
        price: products.price,
        commissionRate: productCommissions.commissionRate,
      })
      .from(products)
      .leftJoin(
        productCommissions,
        and(
          eq(products.id, productCommissions.productId),
          eq(productCommissions.isActive, true)
        )
      )
      .where(eq(products.is_active, true));

    // 데이터 변환 (category_id를 category 문자열로 변환)
    const formattedProducts = productsWithCommission.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category === 1 ? '강의' : '상품',
      price: Number(p.price) || 0,
      commissionRate: Number(p.commissionRate) || 0,
    }));

    console.log(`[Commission] ${formattedProducts.length}개 상품 조회 완료`);
    res.json({ success: true, products: formattedProducts });
  } catch (error) {
    logServerError('[Commission] 상품 조회 오류:', error, req);
    res.status(500).json({ 
      success: false, 
      error: '상품 조회 중 오류가 발생했습니다.' 
    });
  }
});

/**
 * PUT /api/commission/products/:id
 * 상품별 수수료율 수정
 */
commissionRoutes.put('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { commissionRate } = req.body;

    console.log(`[Commission] 상품 ${productId} 수수료율 수정:`, commissionRate);

    // 기존 수수료 설정 확인
    const existingCommission = await db
      .select()
      .from(productCommissions)
      .where(
        and(
          eq(productCommissions.productId, productId),
          eq(productCommissions.isActive, true)
        )
      )
      .limit(1);

    if (existingCommission.length > 0) {
      // 업데이트
      await db
        .update(productCommissions)
        .set({ 
          commissionRate: commissionRate.toString(),
          updatedAt: new Date(),
        })
        .where(eq(productCommissions.id, existingCommission[0].id));
    } else {
      // 신규 생성
      await db.insert(productCommissions).values({
        productId,
        commissionRate: commissionRate.toString(),
        isActive: true,
      });
    }

    console.log(`[Commission] 수수료율 수정 완료`);
    await recordAuditLog(req, {
      action: 'admin.commission.rate_change',
      targetType: 'product',
      targetId: productId,
      payload: { commissionRate },
    });
    res.json({ success: true, message: '수수료율이 수정되었습니다.' });
  } catch (error) {
    logServerError('[Commission] 수수료율 수정 오류', error, req);
    res.status(500).json({ 
      success: false, 
      error: '수수료율 수정 중 오류가 발생했습니다.' 
    });
  }
});

/**
 * GET /api/commission/referrers
 * 추천인 현황 조회
 */
commissionRoutes.get('/referrers', async (req, res) => {
  try {
    console.log('[Commission] 추천인 현황 조회 요청');
    
    const referrers = await db
      .select({
        id: referralProfiles.id,
        name: referralProfiles.userId, // TODO: user 테이블과 조인하여 실제 이름 가져오기
        role: referralProfiles.profileType,
        referralCode: referralProfiles.referralCode,
        earningsTotal: referralProfiles.lifetimeEarnings,
        status: referralProfiles.status,
      })
      .from(referralProfiles)
      .where(eq(referralProfiles.isActive, true))
      .orderBy(desc(referralProfiles.lifetimeEarnings));

    // 데이터 변환
    const formattedReferrers = referrers.map(r => ({
      id: r.id,
      name: r.name?.toString() || '미등록',
      role: r.role === 'trainer' ? '훈련사' : r.role === 'institute' ? '기관' : '제휴사',
      referralCode: r.referralCode,
      earningsTotal: Number(r.earningsTotal) || 0,
      status: r.status === 'active' ? '지급대기' : '지급완료',
    }));

    console.log(`[Commission] ${formattedReferrers.length}명 추천인 조회 완료`);
    res.json({ success: true, referrers: formattedReferrers });
  } catch (error) {
    logServerError('[Commission] 추천인 조회 오류:', error, req);
    res.status(500).json({ 
      success: false, 
      error: '추천인 조회 중 오류가 발생했습니다.' 
    });
  }
});

/**
 * POST /api/commission/settlements/:id/approve
 * 정산 승인
 */
commissionRoutes.post('/settlements/:id/approve', async (req, res) => {
  try {
    const referrerId = parseInt(req.params.id);
    const { amount, period } = req.body;

    console.log(`[Commission] 정산 승인 요청: 추천인 ${referrerId}`);

    // 추천인 정보 조회
    const referrer = await db
      .select()
      .from(referralProfiles)
      .where(eq(referralProfiles.id, referrerId))
      .limit(1);

    if (referrer.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '추천인을 찾을 수 없습니다.' 
      });
    }

    // 정산 레코드 생성
    const newSettlement = await db.insert(settlements).values({
      settlementType: 'referral',
      targetId: referrer[0].userId,
      targetName: '추천인', // TODO: user 테이블에서 실제 이름 가져오기
      referralProfileId: referrerId,
      periodStart: new Date(period.split(' ~ ')[0]),
      periodEnd: new Date(period.split(' ~ ')[1]),
      totalGrossAmount: amount.toString(),
      totalFeeAmount: '0',
      totalNetAmount: amount.toString(),
      transactionCount: 1,
      status: 'completed',
    }).returning();

    // 추천인 상태 업데이트
    await db
      .update(referralProfiles)
      .set({ status: 'inactive' }) // 지급완료 표시
      .where(eq(referralProfiles.id, referrerId));

    console.log(`[Commission] 정산 승인 완료: ${newSettlement[0].id}`);
    await recordAuditLog(req, {
      action: 'admin.settlement.approve',
      targetType: 'settlement',
      targetId: newSettlement[0].id,
      targetName: '추천인 정산',
      payload: { referrerId, amount, period },
    });
    res.json({ 
      success: true, 
      message: '정산이 승인되었습니다.',
      settlement: newSettlement[0],
    });
  } catch (error) {
    logServerError('[Commission] 정산 승인 오류', error, req);
    res.status(500).json({ 
      success: false, 
      error: '정산 승인 중 오류가 발생했습니다.' 
    });
  }
});
