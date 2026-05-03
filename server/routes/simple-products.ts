import { Router } from 'express';
import { db } from '../db';
import { products } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 간단한 상품 목록 조회
router.get('/simple-products', async (req, res) => {
  try {
    const allProducts = await db.select().from(products).limit(10);
    res.json({
      success: true,
      products: allProducts,
      total: allProducts.length
    });
  } catch (error) {
    logServerError('상품 목록 조회 오류:', error, req);
    res.status(500).json({ 
      success: false, 
      error: '상품 목록을 불러오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 상품 상세 조회
router.get('/simple-products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
    
    if (!product.length) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      product: product[0]
    });
  } catch (error) {
    logServerError('상품 상세 조회 오류:', error, req);
    res.status(500).json({ 
      success: false, 
      error: '상품 정보를 불러오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export { router as simpleProductRoutes };