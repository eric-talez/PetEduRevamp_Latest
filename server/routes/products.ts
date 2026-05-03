import { Router } from 'express';
import { db } from '../db';
import { products, productExposures, shoppingCarts, orders, orderItems } from '../../shared/schema';
import { eq, and, or, desc, asc, ilike, gte, lte, count } from 'drizzle-orm';
import { z } from 'zod';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 상품 목록 조회 (공개 API)
router.get('/products', async (req, res) => {
  try {
    const {
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      brand,
      status = 'active'
    } = req.query;

    let query = db.select().from(products);
    
    // 필터 조건
    const conditions = [];
    if (status) conditions.push(eq(products.is_active, status === 'active'));
    if (category) conditions.push(eq(products.category_id, Number(category)));
    if (search) conditions.push(ilike(products.name, `%${search}%`));
    if (minPrice) conditions.push(gte(products.price, minPrice as string));
    if (maxPrice) conditions.push(lte(products.price, maxPrice as string));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // 정렬
    if (sortBy === 'price') {
      query = sortOrder === 'asc' ? query.orderBy(asc(products.price)) : query.orderBy(desc(products.price));
    } else if (sortBy === 'name') {
      query = sortOrder === 'asc' ? query.orderBy(asc(products.name)) : query.orderBy(desc(products.name));
    } else if (sortBy === 'rating') {
      query = query.orderBy(desc(products.rating));
    } else if (sortBy === 'salesCount') {
      query = query.orderBy(desc(products.review_count));
    } else {
      query = query.orderBy(desc(products.created_at));
    }

    // 페이지네이션
    const offset = (Number(page) - 1) * Number(limit);
    const productList = await query.limit(Number(limit)).offset(offset);

    // 총 개수
    const totalQuery = db.select({ count: count() }).from(products);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const [{ count: totalCount }] = await totalQuery;

    res.json({
      products: productList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    logServerError('상품 목록 조회 오류:', error, req);
    res.status(500).json({ error: '상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 상품 상세 조회 (공개 API)
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
    
    if (!product.length) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 조회수 증가 (현재 테이블에는 view_count가 없으므로 주석 처리)
    // await db.update(products)
    //   .set({ 
    //     updated_at: new Date()
    //   })
    //   .where(eq(products.id, Number(id)));

    res.json(product[0]);
  } catch (error) {
    logServerError('상품 상세 조회 오류:', error, req);
    res.status(500).json({ error: '상품 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 카테고리별 상품 개수 조회 (공개 API)
router.get('/categories/count', async (req, res) => {
  try {
    const categoryCounts = await db.select({
      category: products.category_id,
      count: count()
    })
    .from(products)
    .where(eq(products.is_active, true))
    .groupBy(products.category_id);

    res.json(categoryCounts);
  } catch (error) {
    logServerError('카테고리별 상품 개수 조회 오류:', error, req);
    res.status(500).json({ error: '카테고리 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 인기 상품 조회 (공개 API)
router.get('/products/featured/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularProducts = await db.select()
      .from(products)
      .where(eq(products.is_active, true))
      .orderBy(desc(products.review_count), desc(products.rating))
      .limit(Number(limit));

    res.json(popularProducts);
  } catch (error) {
    logServerError('인기 상품 조회 오류:', error, req);
    res.status(500).json({ error: '인기 상품을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 추천 상품 조회 (공개 API)
router.get('/products/featured/recommended', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recommendedProducts = await db.select()
      .from(products)
      .where(eq(products.is_active, true))
      .orderBy(desc(products.rating), desc(products.review_count))
      .limit(Number(limit));

    res.json(recommendedProducts);
  } catch (error) {
    logServerError('추천 상품 조회 오류:', error, req);
    res.status(500).json({ error: '추천 상품을 불러오는 중 오류가 발생했습니다.' });
  }
});

// ===== 관리자 전용 API =====

// 상품 생성 (관리자 전용)
router.post('/admin/products', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const productData = req.body;
    const [newProduct] = await db.insert(products).values(productData).returning();
    
    res.status(201).json(newProduct);
  } catch (error) {
    logServerError('상품 생성 오류:', error, req);
    res.status(500).json({ error: '상품 생성 중 오류가 발생했습니다.' });
  }
});

// 상품 수정 (관리자 전용)
router.put('/admin/products/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { id } = req.params;
    const productData = { ...req.body, updatedAt: new Date() };
    
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, Number(id)))
      .returning();

    if (!updatedProduct) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    res.json(updatedProduct);
  } catch (error) {
    logServerError('상품 수정 오류:', error, req);
    res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
  }
});

// 상품 삭제 (관리자 전용)
router.delete('/admin/products/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { id } = req.params;
    
    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.id, Number(id)))
      .returning();

    if (!deletedProduct) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    res.json({ message: '상품이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    logServerError('상품 삭제 오류:', error, req);
    res.status(500).json({ error: '상품 삭제 중 오류가 발생했습니다.' });
  }
});

// ===== 상품 노출 연결 API =====

// 상품 노출 연결 목록 조회 (관리자 전용)
router.get('/admin/product-exposures', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { exposureType, isActive } = req.query;
    
    let query = db.select({
      id: productExposures.id,
      productId: productExposures.productId,
      productName: products.name,
      exposureType: productExposures.exposureType,
      position: productExposures.position,
      priority: productExposures.priority,
      isActive: productExposures.isActive,
      startDate: productExposures.startDate,
      endDate: productExposures.endDate,
      targetAudience: productExposures.targetAudience,
      clickCount: productExposures.clickCount,
      conversionRate: productExposures.conversionRate,
      createdAt: productExposures.createdAt
    })
    .from(productExposures)
    .innerJoin(products, eq(productExposures.productId, products.id));

    const conditions = [];
    if (exposureType) conditions.push(eq(productExposures.exposureType, exposureType as string));
    if (isActive !== undefined) conditions.push(eq(productExposures.isActive, isActive === 'true'));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const exposures = await query.orderBy(desc(productExposures.priority), desc(productExposures.createdAt));
    
    res.json(exposures);
  } catch (error) {
    logServerError('상품 노출 연결 조회 오류:', error, req);
    res.status(500).json({ error: '상품 노출 연결 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 상품 노출 연결 생성 (관리자 전용)
router.post('/admin/product-exposures', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const exposureData = req.body;
    const [newExposure] = await db.insert(productExposures).values(exposureData).returning();
    
    res.status(201).json(newExposure);
  } catch (error) {
    logServerError('상품 노출 연결 생성 오류:', error, req);
    res.status(500).json({ error: '상품 노출 연결 생성 중 오류가 발생했습니다.' });
  }
});

// 상품 노출 연결 수정 (관리자 전용)
router.put('/admin/product-exposures/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { id } = req.params;
    const exposureData = { ...req.body, updatedAt: new Date() };
    
    const [updatedExposure] = await db
      .update(productExposures)
      .set(exposureData)
      .where(eq(productExposures.id, Number(id)))
      .returning();

    if (!updatedExposure) {
      return res.status(404).json({ error: '상품 노출 연결을 찾을 수 없습니다.' });
    }

    res.json(updatedExposure);
  } catch (error) {
    logServerError('상품 노출 연결 수정 오류:', error, req);
    res.status(500).json({ error: '상품 노출 연결 수정 중 오류가 발생했습니다.' });
  }
});

// 상품 노출 연결 삭제 (관리자 전용)
router.delete('/admin/product-exposures/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { id } = req.params;
    
    const [deletedExposure] = await db
      .delete(productExposures)
      .where(eq(productExposures.id, Number(id)))
      .returning();

    if (!deletedExposure) {
      return res.status(404).json({ error: '상품 노출 연결을 찾을 수 없습니다.' });
    }

    res.json({ message: '상품 노출 연결이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    logServerError('상품 노출 연결 삭제 오류:', error, req);
    res.status(500).json({ error: '상품 노출 연결 삭제 중 오류가 발생했습니다.' });
  }
});

export { router as productRoutes };