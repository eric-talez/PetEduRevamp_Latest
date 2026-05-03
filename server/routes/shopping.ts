import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { products, shopCategories, cartItems } from "../../shared/schema";
import { eq, and, or, like, gte, lte, desc, count } from "drizzle-orm";
import type { IStorage } from "../storage";
import { recordAuditLog, logServerError } from '../middleware/audit-logger';

// 관리자 권한 검사 미들웨어
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: '로그인이 필요합니다.',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: '관리자 권한이 필요합니다.',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  next();
};

export function registerShoppingRoutes(app: Express, storage: IStorage) {
  console.log('[ShoppingRoutes] 쇼핑 라우트 등록 시작');
  
  // 상품 목록 조회 (storage를 통한 DB 조회)
  app.get("/api/shop/products", async (req, res) => {
    try {
      console.log('[ShoppingRoutes] 상품 목록 조회 요청');
      const productList = await storage.getAllProducts();
      console.log(`[ShoppingRoutes] 상품 ${productList?.length || 0}개 조회됨`);
      res.json({ success: true, products: productList || [] });
    } catch (error) {
      logServerError('Error fetching products:', error, req);
      res.status(500).json({ error: '상품 목록을 불러올 수 없습니다' });
    }
  });

  // 코스 목록 조회 (교육 관련)
  app.get("/api/courses", async (req, res) => {
    try {
      // Implement your logic to fetch courses here
      // Example:
      // const courses = await storage.getCourses();
      // res.json(courses || []);
      res.status(501).json({ message: 'Not Implemented' });
    } catch (error) {
      logServerError('Error fetching courses:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 상품 목록 가져오기 (검색 및 필터링 포함)
  app.get("/api/shopping/products", async (req, res) => {
    try {
      const { search, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;

      let whereConditions: any[] = [];

      // 검색 조건 추가
      if (search) {
        whereConditions.push(
          or(
            like(products.name, `%${search}%`),
            like(products.description, `%${search}%`)
          )
        );
      }

      // 카테고리 필터
      if (category && category !== 'all') {
        whereConditions.push(eq(products.categoryId, parseInt(category as string)));
      }

      // 가격 범위 필터
      if (minPrice) {
        whereConditions.push(gte(products.price, parseInt(minPrice as string)));
      }
      if (maxPrice) {
        whereConditions.push(lte(products.price, parseInt(maxPrice as string)));
      }

      // 활성화된 상품만 표시
      whereConditions.push(eq(products.isActive, true));

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // 전체 개수 조회
      const totalResult = await db
        .select({ count: count() })
        .from(products)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // 페이지네이션과 함께 상품 목록 조회
      const offset = (Number(page) - 1) * Number(limit);

      const productList = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          discountPrice: products.discountPrice,
          categoryId: products.categoryId,
          images: products.images,
          tags: products.tags,
          stock: products.stock,
          isActive: products.isActive,
          rating: products.rating,
          reviewCount: products.reviewCount,
          createdAt: products.createdAt
        })
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json({
        products: productList,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      logServerError('Error fetching products:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 특정 상품 상세 정보 가져오기
  app.get("/api/shopping/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);

      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product[0]);
    } catch (error) {
      logServerError('Error fetching product details:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 쇼핑 카테고리 목록 가져오기
  app.get("/api/shopping/categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(shopCategories)
        .where(eq(shopCategories.isActive, true))
        .orderBy(shopCategories.sortOrder);

      res.json(categories);
    } catch (error) {
      logServerError('Error fetching categories:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 장바구니에 상품 추가
  app.post("/api/shopping/cart", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user!.id;
      const { productId, quantity = 1 } = req.body;

      // 상품 존재 확인
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // 재고 확인
      if (product[0].stock && product[0].stock < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      // 이미 장바구니에 있는지 확인
      const existingItem = await db
        .select()
        .from(cartItems)
        .where(and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        ))
        .limit(1);

      if (existingItem[0]) {
        // 기존 아이템 수량 업데이트
        const updatedItem = await db
          .update(cartItems)
          .set({ 
            quantity: existingItem[0].quantity + quantity,
            updatedAt: new Date()
          })
          .where(eq(cartItems.id, existingItem[0].id))
          .returning();

        res.json(updatedItem[0]);
      } else {
        // 새 아이템 추가
        const newItem = await db
          .insert(cartItems)
          .values({
            userId,
            productId,
            quantity,
            createdAt: new Date()
          })
          .returning();

        res.status(201).json(newItem[0]);
      }
    } catch (error) {
      logServerError('Error adding to cart:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 사용자의 장바구니 목록 가져오기
  app.get("/api/shopping/cart", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user!.id;

      const cartList = await db
        .select({
          id: cartItems.id,
          quantity: cartItems.quantity,
          createdAt: cartItems.createdAt,
          product: {
            id: products.id,
            name: products.name,
            price: products.price,
            discountPrice: products.discountPrice,
            images: products.images,
            stock: products.stock
          }
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.userId, userId))
        .orderBy(desc(cartItems.createdAt));

      res.json(cartList);
    } catch (error) {
      logServerError('Error fetching cart:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 장바구니 아이템 수량 업데이트
  app.patch("/api/shopping/cart/:itemId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const itemId = parseInt(req.params.itemId);
      const userId = req.user!.id;
      const { quantity } = req.body;

      if (quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
      }

      const updatedItem = await db
        .update(cartItems)
        .set({ 
          quantity,
          updatedAt: new Date()
        })
        .where(and(
          eq(cartItems.id, itemId),
          eq(cartItems.userId, userId)
        ))
        .returning();

      if (!updatedItem[0]) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      res.json(updatedItem[0]);
    } catch (error) {
      logServerError('Error updating cart item:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 장바구니에서 아이템 삭제
  app.delete("/api/shopping/cart/:itemId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const itemId = parseInt(req.params.itemId);
      const userId = req.user!.id;

      const deletedItem = await db
        .delete(cartItems)
        .where(and(
          eq(cartItems.id, itemId),
          eq(cartItems.userId, userId)
        ))
        .returning();

      if (!deletedItem[0]) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      logServerError('Error removing cart item:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 위시리스트에 상품 추가
  app.post("/api/shopping/wishlist", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user!.id;
      const { productId } = req.body;

      // 상품 존재 확인
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // 이미 위시리스트에 있는지 확인
      const { wishlistItems } = await import('@shared/schema');
      const existingItem = await db
        .select()
        .from(wishlistItems)
        .where(and(
          eq(wishlistItems.userId, userId),
          eq(wishlistItems.productId, productId)
        ))
        .limit(1);

      if (existingItem[0]) {
        return res.status(409).json({ message: 'Product already in wishlist' });
      }

      // 위시리스트에 추가
      const newItem = await db
        .insert(wishlistItems)
        .values({
          userId,
          productId,
          createdAt: new Date()
        })
        .returning();

      res.status(201).json(newItem[0]);
    } catch (error) {
      logServerError('Error adding to wishlist:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 위시리스트에서 상품 제거
  app.delete("/api/shopping/wishlist", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user!.id;
      const { productId } = req.body;

      const { wishlistItems } = await import('@shared/schema');
      const deletedItem = await db
        .delete(wishlistItems)
        .where(and(
          eq(wishlistItems.userId, userId),
          eq(wishlistItems.productId, productId)
        ))
        .returning();

      if (!deletedItem[0]) {
        return res.status(404).json({ message: 'Wishlist item not found' });
      }

      res.json({ message: 'Item removed from wishlist' });
    } catch (error) {
      logServerError('Error removing from wishlist:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 상품 등록 API
  app.post("/api/admin/products", async (req, res) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const {
        name,
        description,
        price,
        discountPrice,
        categoryId,
        images,
        tags,
        stock,
        specifications,
        brand,
        model,
        weight,
        dimensions
      } = req.body;

      // 필수 필드 검증
      if (!name || !price || !categoryId) {
        return res.status(400).json({ 
          message: 'Missing required fields: name, price, categoryId' 
        });
      }

      // 새 상품 생성
      const newProduct = await db
        .insert(products)
        .values({
          name,
          description,
          price,
          discountPrice,
          categoryId,
          images: images || [],
          tags: tags || [],
          stock: stock || 0,
          specifications: specifications || {},
          brand,
          model,
          weight,
          dimensions,
          isActive: true,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log('새 상품 등록됨:', newProduct[0]);

      await recordAuditLog(req, {
        action: 'admin.product.create',
        targetType: 'product',
        targetId: newProduct[0]?.id,
        targetName: newProduct[0]?.name,
        payload: { price, discountPrice, categoryId, stock, brand, model },
      });

      res.status(201).json({
        message: 'Product created successfully',
        product: newProduct[0]
      });
    } catch (error) {
      logServerError('Error creating product:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 상품 수정 API
  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const productId = parseInt(req.params.id);
      const updateData = { ...req.body, updatedAt: new Date() };

      const previous = await db.select().from(products).where(eq(products.id, productId)).limit(1);

      const updatedProduct = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('상품 수정됨:', updatedProduct[0]);

      const before = previous[0] || {};
      const after = updatedProduct[0];
      const priceChanged = 'price' in req.body && String(before.price) !== String(after.price);
      const discountChanged = 'discountPrice' in req.body && String(before.discountPrice) !== String(after.discountPrice);
      const action = priceChanged || discountChanged ? 'admin.product.price_change' : 'admin.product.update';
      await recordAuditLog(req, {
        action,
        targetType: 'product',
        targetId: productId,
        targetName: after.name,
        payload: {
          before: { price: before.price, discountPrice: before.discountPrice, stock: before.stock, isActive: before.isActive },
          after: { price: after.price, discountPrice: after.discountPrice, stock: after.stock, isActive: after.isActive },
          priceChanged,
          discountChanged,
        },
      });

      res.json({
        message: 'Product updated successfully',
        product: updatedProduct[0]
      });
    } catch (error) {
      logServerError('Error updating product:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 상품 삭제 API
  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const productId = parseInt(req.params.id);

      // 상품을 완전히 삭제하지 않고 비활성화
      const deactivatedProduct = await db
        .update(products)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      if (!deactivatedProduct[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('상품 비활성화됨:', deactivatedProduct[0]);

      await recordAuditLog(req, {
        action: 'admin.product.deactivate',
        targetType: 'product',
        targetId: productId,
        targetName: deactivatedProduct[0]?.name,
        payload: { isActive: false },
      });

      res.json({
        message: 'Product deactivated successfully',
        product: deactivatedProduct[0]
      });
    } catch (error) {
      logServerError('Error deactivating product:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 상품 목록 조회 (비활성화된 상품 포함)
  app.get("/api/admin/products", async (req, res) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { page = 1, limit = 20, search, category, status } = req.query;

      let whereConditions: any[] = [];

      // 검색 조건
      if (search) {
        whereConditions.push(
          or(
            like(products.name, `%${search}%`),
            like(products.description, `%${search}%`),
            like(products.brand, `%${search}%`)
          )
        );
      }

      // 카테고리 필터
      if (category && category !== 'all') {
        whereConditions.push(eq(products.categoryId, parseInt(category as string)));
      }

      // 상태 필터
      if (status === 'active') {
        whereConditions.push(eq(products.isActive, true));
      } else if (status === 'inactive') {
        whereConditions.push(eq(products.isActive, false));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // 전체 개수 조회
      const totalResult = await db
        .select({ count: count() })
        .from(products)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // 페이지네이션과 함께 상품 목록 조회
      const offset = (Number(page) - 1) * Number(limit);

      const productList = await db
        .select()
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json({
        products: productList,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      logServerError('Error fetching admin products:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 추천인 코드 유효성 검사
  app.post("/api/shopping/referral/validate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { referralCode, productId } = req.body;

      // 추천인 코드 검증 로직
      const { referralCodes } = await import('@shared/schema');
      const referral = await db
        .select()
        .from(referralCodes)
        .where(and(
          eq(referralCodes.code, referralCode),
          eq(referralCodes.isActive, true)
        ))
        .limit(1);

      if (!referral[0]) {
        return res.json({ 
          isValid: false, 
          message: '유효하지 않은 추천인 코드입니다.' 
        });
      }

      // 만료일 체크
      if (referral[0].expiresAt && new Date() > referral[0].expiresAt) {
        return res.json({ 
          isValid: false, 
          message: '만료된 추천인 코드입니다.' 
        });
      }

      res.json({
        isValid: true,
        discountPercent: referral[0].discountPercent || 10,
        message: '추천인 코드가 유효합니다.'
      });
    } catch (error) {
      logServerError('Error validating referral code:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 주문 기능은 나중에 구현 예정
}