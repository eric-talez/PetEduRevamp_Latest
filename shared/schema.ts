import { pgTable, text, integer, boolean, timestamp, serial, decimal, jsonb, json, varchar, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod";

// 사용자 테이블
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"), // nullable for social login users
  role: varchar("role", { length: 50 }).notNull().default("pet-owner"),
  name: varchar("name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  phoneNumber: varchar("phone_number", { length: 20 }), // 새로운 휴대폰 번호 필드
  birthDate: varchar("birth_date", { length: 10 }), // YYYY-MM-DD 형식
  age: integer("age"), // 연령
  gender: varchar("gender", { length: 10 }), // 성별 (male/female)
  avatar: text("avatar"), // 프로필 이미지
  profileImage: text("profile_image"),
  bio: text("bio"),
  specialty: text("specialty"), // 전문 분야 (훈련사용)
  location: text("location"), // 위치 (훈련사용)
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  isVerified: boolean("is_verified").default(false), // 훈련사 인증 여부
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  approvedAt: timestamp("approved_at"), // 승인 일시
  approvedBy: integer("approved_by"), // 승인한 관리자 ID
  rejectionReason: text("rejection_reason"), // 거부 사유
  instituteId: integer("institute_id").references(() => institutes.id), // 소속 기관
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Missing columns from error report
  subscriptionTier: text("subscription_tier").default("free"),
  referralCode: text("referral_code"),
  aiUsage: integer("ai_usage").default(0),
  points: integer("points").default(0),
  fullName: varchar("full_name", { length: 200 }),
  // 훈련사 화상수업 관련 필드
  zoomLink: text("zoom_link"), // 개인 Zoom 링크 (기존)
  zoomPMI: varchar("zoom_pmi", { length: 20 }), // 개인 회의 번호 (Personal Meeting ID)
  zoomPMIPassword: varchar("zoom_pmi_password", { length: 50 }), // PMI 비밀번호
  zoomHostKey: varchar("zoom_host_key", { length: 20 }), // 호스트 키 (선택사항)
  videoCallPreference: varchar("video_call_preference", { length: 50 }).default("zoom"), // zoom, teams, webex 등
  // 위치 정보 (훈련사/기관용)
  address: text("address"), // 주소
  latitude: text("latitude"), // 위도
  longitude: text("longitude"), // 경도
  workingArea: text("working_area"), // 활동 지역
  // 소셜 로그인 관련 필드
  provider: varchar("provider", { length: 20 }), // kakao, naver, google
  socialId: varchar("social_id", { length: 255 }), // 소셜 플랫폼에서 제공하는 고유 ID
  ci: text("ci"), // 본인인증 CI 값
  verified: boolean("verified").default(false), // 인증 여부
  verifiedAt: timestamp("verified_at"), // 인증 완료 시각
  verificationName: text("verification_name"), // 본인인증 이름
  verificationBirth: text("verification_birth"), // 본인인증 생년월일
  verificationPhone: text("verification_phone"), // 본인인증 휴대폰
  stripeCustomerId: text("stripe_customer_id"), // Stripe 고객 ID
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe 구독 ID
  membershipTier: text("membership_tier"), // 멤버십 등급
  membershipExpiresAt: timestamp("membership_expires_at"), // 멤버십 만료일
});

// 강의 테이블
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  content: text("content"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: integer("duration"),
  level: varchar("level", { length: 50 }),
  category: varchar("category", { length: 100 }),
  instructorId: integer("instructor_id").references(() => users.id),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(), // Critical: Institute-scoped RBAC
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  enrollmentCount: integer("enrollment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  byCreatedAt: index("idx_courses_created_at").on(t.createdAt),
}));

// 기관 테이블
export const institutes = pgTable("institutes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  businessNumber: text("business_number"),
  capacity: integer("capacity"),
  code: text("code"),
  latitude: text("latitude"), // 위도
  longitude: text("longitude"), // 경도
  rating: decimal("rating", { precision: 3, scale: 2 }), // 평점
  certification: boolean("certification").default(false), // 테일즈 인증 여부
  isActive: boolean("is_active").default(true),
  featuresEnabled: jsonb("features_enabled"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 구독 플랜 테이블
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("KRW"),
  billingPeriod: varchar("billing_period", { length: 20 }).default("monthly"),
  maxMembers: integer("max_members").notNull(),
  maxVideoHours: integer("max_video_hours").notNull(),
  maxAiAnalysis: integer("max_ai_analysis").notNull(),
  features: jsonb("features").notNull(),
  benefits: jsonb("benefits"),
  stripeProductId: varchar("stripe_product_id", { length: 100 }),
  stripePriceId: varchar("stripe_price_id", { length: 100 }),
  audience: varchar("audience", { length: 20 }).default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 사용자 구독 테이블 (Stripe 정기 구독)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("incomplete"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at"),
  defaultPaymentMethodBrand: varchar("default_payment_method_brand", { length: 50 }),
  defaultPaymentMethodLast4: varchar("default_payment_method_last4", { length: 10 }),
  latestInvoiceStatus: varchar("latest_invoice_status", { length: 30 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 구독 결제 이력 (Stripe Invoice)
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: serial("id").primaryKey(),
  userSubscriptionId: integer("user_subscription_id").references(() => userSubscriptions.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 100 }),
  amountDue: integer("amount_due").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  currency: varchar("currency", { length: 10 }).default("krw"),
  status: varchar("status", { length: 30 }).notNull(),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  paidAt: timestamp("paid_at"),
  failureMessage: text("failure_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().default("KRW"),
  billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
  maxMembers: z.number().int().default(0),
  maxVideoHours: z.number().int().default(0),
  maxAiAnalysis: z.number().int().default(0),
  features: z.record(z.any()).optional().default({}),
  benefits: z.array(z.string()).optional().default([]),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  audience: z.enum(["user", "institute", "trainer"]).default("user"),
  isActive: z.boolean().default(true),
});

export const updateSubscriptionPlanSchema = insertSubscriptionPlanSchema.partial();
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UpdateSubscriptionPlan = z.infer<typeof updateSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;

// 반려동물 테이블
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  species: varchar("species", { length: 50 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: integer("age"),
  gender: varchar("gender", { length: 10 }), // male, female
  weight: decimal("weight", { precision: 5, scale: 2 }),
  color: varchar("color", { length: 100 }),
  personality: text("personality"),
  medicalHistory: text("medical_history"),
  specialNotes: text("special_notes"),
  ownerId: integer("owner_id").references(() => users.id),
  profileImage: text("profile_image"),
  imageUrl: text("image_url"), // 추가 이미지 필드
  notes: text("notes"),
  // 훈련 관련 필드
  trainingStatus: varchar("training_status", { length: 50 }).default("not_assigned"), // not_assigned, assigned, in_progress, completed
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id),
  assignedTrainerName: varchar("assigned_trainer_name", { length: 100 }),
  trainingType: varchar("training_type", { length: 50 }), // basic, advanced, behavioral_correction
  notebookEnabled: boolean("notebook_enabled").default(false),
  trainingStartDate: timestamp("training_start_date"),
  lastNotebookEntry: text("last_notebook_entry"),
  temperamentLevel: varchar("temperament_level", { length: 1 }),
  isActive: boolean("is_active").default(true),
  diaryShareWithTrainer: boolean("diary_share_with_trainer").default(false), // 다이어리 트레이너 공유 여부
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 반려동물 알림장 상태 값들을 위한 enum 정의
export const poopStatusEnum = z.enum(["normal", "soft", "diarrhea", "constipated", "bloody", "unknown"]);
export const mealStatusEnum = z.enum(["normal", "low", "skipped", "vomited", "overeaten", "unknown"]);
export const walkStatusEnum = z.enum(["normal", "short", "long", "hyper", "limp", "unknown"]);
export const moodEnum = z.enum(["happy", "sad", "anxious", "calm", "energetic", "tired", "unknown"]);

// 반려동물 알림장 테이블
export const careLogs = pgTable("care_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(), // YYYY-MM-DD 형식
  note: text("note"), // 일반 텍스트 메모
  poopStatus: varchar("poop_status", { length: 20 }), // normal, soft, diarrhea, constipated, bloody, unknown
  mealStatus: varchar("meal_status", { length: 20 }), // normal, low, skipped, vomited, overeaten, unknown  
  walkStatus: varchar("walk_status", { length: 20 }), // normal, short, long, hyper, limp, unknown
  mood: varchar("mood", { length: 20 }), // happy, sad, anxious, calm, energetic, tired, unknown
  energyLevel: integer("energy_level"), // 1-5 범위
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }), // 체중 기록 (kg)
  exerciseMinutes: integer("exercise_minutes"), // 운동 시간 (분)
  mealAmountG: integer("meal_amount_g"), // 식사량 (g)
  medications: jsonb("medications"), // 그날 복용한 약 [{name, dosage}]
  media: jsonb("media"), // [{id, url, type, width, height, caption}, ...]
  tags: jsonb("tags"), // 추가 태그들
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 약 복용 일정 테이블 (다이어리)
export const petMedications = pgTable("pet_medications", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  frequency: varchar("frequency", { length: 100 }),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPetMedicationSchema = createInsertSchema(petMedications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPetMedication = z.infer<typeof insertPetMedicationSchema>;
export type PetMedication = typeof petMedications.$inferSelect;

// AI 분석 결과 테이블  
export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  inputLogIds: jsonb("input_log_ids").notNull(), // 분석에 사용된 care_log IDs 배열
  selectedSignals: jsonb("selected_signals").notNull(), // {text: true, poop: false, meal: true, walk: true, media: false}
  timeRange: text("time_range"), // "2024-01-01 to 2024-01-07" 형식
  model: varchar("model", { length: 50 }).default("gpt-4o-mini"), // 사용된 AI 모델
  resultJson: jsonb("result_json").notNull(), // 구조화된 분석 결과
  tokensIn: integer("tokens_in"), // 입력 토큰 수
  tokensOut: integer("tokens_out"), // 출력 토큰 수
  createdAt: timestamp("created_at").defaultNow(),
});

// AI 분석 리포트 공유 토큰 테이블 (PDF 공유 링크)
export const aiAnalysisShareTokens = pgTable("ai_analysis_share_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  analysisId: integer("analysis_id").references(() => aiAnalyses.id).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  accessCount: integer("access_count").default(0).notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  lastAccessedIp: varchar("last_accessed_ip", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export type AiAnalysisShareToken = typeof aiAnalysisShareTokens.$inferSelect;

// 예방접종 스케줄 테이블
export const vaccinations = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  vaccineName: varchar("vaccine_name", { length: 100 }).notNull(), // 백신 종류 (광견병, DHPPL, 코로나 등)
  vaccineDate: date("vaccine_date").notNull(), // 접종 예정일 또는 접종일
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, completed, overdue, cancelled
  hospitalName: varchar("hospital_name", { length: 200 }), // 병원 이름
  hospitalAddress: text("hospital_address"), // 병원 주소
  hospitalLatitude: text("hospital_latitude"), // 병원 위도
  hospitalLongitude: text("hospital_longitude"), // 병원 경도
  hospitalPhone: varchar("hospital_phone", { length: 20 }), // 병원 전화번호
  notes: text("notes"), // 메모
  nextDueDate: date("next_due_date"), // 다음 접종 예정일
  reminderEnabled: boolean("reminder_enabled").default(true), // 알림 활성화 여부
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 커뮤니티 게시글 테이블 - 실제 데이터베이스 스키마에 맞춤
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id),
  category: text("category"),
  tag: text("tag"), // 태그 (단일 텍스트)
  image: text("image"), // 이미지 URL
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0), // 댓글 수
  // 이벤트/행사 위치 정보
  locationName: varchar("location_name", { length: 200 }), // 장소 이름
  locationAddress: text("location_address"), // 주소
  locationLatitude: text("location_latitude"), // 위도
  locationLongitude: text("location_longitude"), // 경도
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 댓글 테이블 - 실제 데이터베이스 스키마에 맞춤
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  postId: integer("post_id").references(() => posts.id),
  authorId: integer("user_id").references(() => users.id), // DB column is user_id
  parentId: integer("parent_id"),
  likes: integer("likes").default(0),
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false), // Using isDeleted instead of isActive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 예약 테이블
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  trainerId: integer("trainer_id").references(() => users.id),
  petId: integer("pet_id").references(() => pets.id),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60),
  status: varchar("status", { length: 50 }).default("pending"),
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 상품 테이블 (실제 데이터베이스 구조에 맞게 수정)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  discount_price: integer("discount_price"),
  category_id: integer("category_id"),
  images: jsonb("images"),
  tags: jsonb("tags"),
  stock: integer("stock").default(0),
  low_stock_threshold: integer("low_stock_threshold").default(10), // 재고 부족 알림 기준
  auto_reorder_enabled: boolean("auto_reorder_enabled").default(false), // 자동 재주문 활성화
  auto_reorder_quantity: integer("auto_reorder_quantity").default(50), // 자동 재주문 수량
  supplier_id: integer("supplier_id"), // 공급업체 ID
  is_active: boolean("is_active").default(true),
  rating: integer("rating").default(0),
  review_count: integer("review_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// 기관별 추천 상품 테이블
export const instituteProductRecommendations = pgTable("institute_product_recommendations", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  recommendationType: varchar("recommendation_type", { length: 50 }).notNull(), // 'featured', 'essential', 'popular', 'seasonal'
  priority: integer("priority").default(5), // 우선순위 (1-10)
  customMessage: text("custom_message"), // 기관별 맞춤 메시지
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"), // 기관 전용 할인율
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  clickCount: integer("click_count").default(0),
  purchaseCount: integer("purchase_count").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 커리큘럼-상품 매핑 테이블
export const curriculumProductMappings = pgTable("curriculum_product_mappings", {
  id: serial("id").primaryKey(),
  curriculumId: varchar("curriculum_id", { length: 100 }).notNull(), // 커리큘럼 ID
  moduleId: varchar("module_id", { length: 100 }), // 모듈 ID (선택적)
  productId: integer("product_id").references(() => products.id).notNull(),
  materialName: varchar("material_name", { length: 200 }).notNull(), // 준비물 이름
  quantity: integer("quantity").default(1), // 필요 수량
  isRequired: boolean("is_required").default(true), // 필수 여부
  isOptional: boolean("is_optional").default(false), // 선택 여부
  suggestedAlternatives: jsonb("suggested_alternatives"), // 대체 상품 목록
  usageDescription: text("usage_description"), // 사용법 설명
  estimatedUsage: integer("estimated_usage"), // 예상 사용량 (시간/회차)
  autoOrder: boolean("auto_order").default(false), // 자동 주문 설정
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 자동 재고 주문 내역 테이블
export const autoInventoryOrders = pgTable("auto_inventory_orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'low_stock', 'curriculum_demand', 'seasonal'
  triggeredBy: varchar("triggered_by", { length: 100 }), // 트리거 원인 (커리큘럼 ID 등)
  requestedQuantity: integer("requested_quantity").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'approved', 'ordered', 'received', 'cancelled'
  orderDate: timestamp("order_date"),
  expectedDelivery: timestamp("expected_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 상품 노출 연결 테이블
export const productExposures = pgTable("product_exposures", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  exposureType: varchar("exposure_type", { length: 50 }).notNull(), // homepage, category, search, promotion
  position: integer("position").default(0),
  priority: integer("priority").default(5),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetAudience: varchar("target_audience", { length: 100 }),
  clickCount: integer("click_count").default(0),
  impressionCount: integer("impression_count").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 쇼핑 카트 테이블
export const shoppingCarts = pgTable("shopping_carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 주문 테이블
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  paymentIntentId: text("payment_intent_id").unique(),
  shippingAddress: jsonb("shipping_address"),
  billingAddress: jsonb("billing_address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  byCreatedAt: index("idx_orders_created_at").on(t.createdAt),
}));

// 주문 아이템 테이블
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 알림 테이블
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  category: varchar("category", { length: 30 }),
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byCreatedAt: index("idx_notifications_created_at").on(t.createdAt),
  byIsRead: index("idx_notifications_is_read").on(t.isRead),
  byType: index("idx_notifications_type").on(t.type),
}));

// 사용자별 알림 카테고리 수신 설정 테이블
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FCM 기기 토큰 테이블
export const fcmTokens = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  deviceType: varchar("device_type", { length: 20 }), // 'web', 'android', 'ios'
  deviceInfo: jsonb("device_info"), // 브라우저/기기 정보
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 푸시 캠페인 테이블 (대량/세그먼트 발송용)
export const pushCampaigns = pgTable("push_campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("draft"), // draft, scheduled, sending, completed, cancelled
  targetType: varchar("target_type", { length: 30 }).notNull(), // all, role, segment, topic
  targetCriteria: jsonb("target_criteria"), // { role: 'pet-owner', petTypes: ['dog'] } 등
  scheduledAt: timestamp("scheduled_at"), // 예약 발송 시간
  sentAt: timestamp("sent_at"), // 실제 발송 시간
  totalRecipients: integer("total_recipients").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  data: jsonb("data"), // 추가 데이터 (actionUrl 등)
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 예약 푸시 알림 테이블 (개별 알림 예약)
export const scheduledPushNotifications = pgTable("scheduled_push_notifications", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => pushCampaigns.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, failed, cancelled
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 푸시 발송 이력 테이블
export const pushNotificationLogs = pgTable("push_notification_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => pushCampaigns.id),
  userId: integer("user_id").references(() => users.id),
  tokenId: integer("token_id").references(() => fcmTokens.id),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // success, failed
  messageId: text("message_id"), // FCM 응답 메시지 ID
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

// 시스템 설정 테이블
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Zod 스키마 생성
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertInstituteSchema = createInsertSchema(institutes);
export const selectInstituteSchema = createSelectSchema(institutes);
export const insertSystemSettingSchema = createInsertSchema(systemSettings, {
  key: z.string().min(1, "키는 필수입니다").max(100),
  value: z.string(),
  description: z.string().optional().nullable(),
  category: z.string().max(50).optional().nullable(),
}).omit({
  id: true,
  updatedAt: true,
});
export const selectSystemSettingSchema = createSelectSchema(systemSettings);
export type SystemSetting = z.infer<typeof selectSystemSettingSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
// Basic Pet Zod Schemas
export const insertPetSchema = createInsertSchema(pets).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  assignedTrainerId: true, // 관리자만 설정 가능
  assignedTrainerName: true
});

export const updatePetSchema = insertPetSchema.partial().omit({ 
  ownerId: true // 소유자는 변경 불가
});

export const selectPetSchema = createSelectSchema(pets);

// Enhanced Pet validation schemas with custom rules
export const createPetSchema = z.object({
  name: z.string().min(1, "반려동물 이름은 필수입니다").max(100, "이름은 100자를 초과할 수 없습니다"),
  species: z.string().min(1, "종(Species)은 필수입니다").max(50, "종 이름은 50자를 초과할 수 없습니다"),
  breed: z.string().max(100, "품종 이름은 100자를 초과할 수 없습니다").optional().nullable(),
  age: z.number().int().min(0, "나이는 0 이상이어야 합니다").max(30, "나이는 30세를 초과할 수 없습니다").optional().nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  weight: z.coerce.number().min(0.1, "체중은 0.1kg 이상이어야 합니다").max(200, "체중은 200kg을 초과할 수 없습니다").optional().nullable(),
  color: z.string().max(100, "색상은 100자를 초과할 수 없습니다").optional().nullable(),
  personality: z.string().max(500, "성격 설명은 500자를 초과할 수 없습니다").optional().nullable(),
  medicalHistory: z.string().max(1000, "병력은 1000자를 초과할 수 없습니다").optional().nullable(),
  specialNotes: z.string().max(1000, "특이사항은 1000자를 초과할 수 없습니다").optional().nullable(),
  profileImage: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable(),
  imageUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable(),
  notes: z.string().max(1000, "메모는 1000자를 초과할 수 없습니다").optional().nullable(),
  trainingStatus: z.enum(["not_assigned", "assigned", "in_progress", "completed"]).default("not_assigned"),
  trainingType: z.enum(["basic", "advanced", "behavioral_correction"]).optional().nullable(),
  notebookEnabled: z.boolean().default(false),
  ownerId: z.number().int().positive("올바른 사용자 ID가 필요합니다"),
  isActive: z.boolean().default(true)
});

export const updatePetValidationSchema = createPetSchema.partial().omit({
  ownerId: true // 소유자는 변경 불가
});

// Pet type definitions
export type InsertPet = z.infer<typeof insertPetSchema>;
export type UpdatePet = z.infer<typeof updatePetSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetValidationSchema>;
// 새로운 테이블들의 Zod 스키마는 하단에서 정의됨

// Missing schema tables required by storage.ts
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  category: varchar("category", { length: 100 }),
  organizerId: integer("organizer_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사 활동 로그 테이블
export const trainerActivityLogs = pgTable("trainer_activity_logs", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // 'review_video', 'live_stream', 'comment', 'content_upload', 'consultation', 'course_creation'
  activityTitle: varchar("activity_title", { length: 200 }),
  activityDescription: text("activity_description"),
  pointsEarned: integer("points_earned").default(0),
  incentiveAmount: decimal("incentive_amount", { precision: 10, scale: 2 }).default("0"),
  metadata: jsonb("metadata"), // 추가 정보 저장
  createdAt: timestamp("created_at").defaultNow(),
});

// 인센티브 지급 내역 테이블
export const incentivePayments = pgTable("incentive_payments", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  activityLogId: integer("activity_log_id").references(() => trainerActivityLogs.id),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // 'review_video', 'point_reward', 'priority_settlement'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("KRW"),
  status: varchar("status", { length: 30 }).default("pending"), // 'pending', 'approved', 'paid', 'rejected'
  paymentDate: timestamp("payment_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사 등급 시스템 테이블
export const trainerRankings = pgTable("trainer_rankings", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM' format
  totalPoints: integer("total_points").default(0),
  activityScore: decimal("activity_score", { precision: 10, scale: 2 }).default("0"),
  rankPosition: integer("rank_position"),
  isTopPerformer: boolean("is_top_performer").default(false), // 상위 10%
  prioritySettlement: boolean("priority_settlement").default(false),
  bonusMultiplier: decimal("bonus_multiplier", { precision: 3, scale: 2 }).default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 포인트 규칙 테이블
export const pointRules = pgTable("point_rules", {
  id: serial("id").primaryKey(),
  activityType: varchar("activity_type", { length: 50 }).notNull().unique(), // 활동 유형
  activityName: varchar("activity_name", { length: 100 }).notNull(), // 활동 이름
  pointsPerAction: integer("points_per_action").notNull(), // 기본 포인트
  maxDailyPoints: integer("max_daily_points"), // 일일 최대 포인트
  maxMonthlyPoints: integer("max_monthly_points"), // 월간 최대 포인트
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 월별 포인트 합산 테이블
export const monthlyPointSummary = pgTable("monthly_point_summary", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM' format
  totalPoints: integer("total_points").default(0),
  videoUploadPoints: integer("video_upload_points").default(0),
  commentPoints: integer("comment_points").default(0),
  viewPoints: integer("view_points").default(0),
  recruitmentPoints: integer("recruitment_points").default(0),
  certificationPoints: integer("certification_points").default(0),
  consultationPoints: integer("consultation_points").default(0),
  courseCreationPoints: integer("course_creation_points").default(0),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 포인트 거래 내역 테이블
export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  activityLogId: integer("activity_log_id").references(() => trainerActivityLogs.id),
  pointRuleId: integer("point_rule_id").references(() => pointRules.id),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'earned', 'deducted', 'bonus'
  points: integer("points").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventLocations = pgTable("event_locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address").notNull(),
  capacity: integer("capacity"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 반려견 시설 테이블
export const petFacilities = pgTable("pet_facilities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // hospital, cafe, restaurant, park, grooming, hotel, training
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventAttendances = pgTable("event_attendances", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id),
  userId: integer("user_id").references(() => users.id),
  attendedAt: timestamp("attended_at").defaultNow(),
});

export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  bio: text("bio"),
  specialty: text("specialty"),
  specialties: jsonb("specialties"), // array of specializations
  experience: integer("experience"),
  certification: text("certification"),
  certifications: jsonb("certifications"), // array of certifications
  price: decimal("price", { precision: 10, scale: 2 }),
  location: text("location"),
  address: text("address"),
  profileImage: text("profile_image"),
  avatar: text("avatar"),
  background: text("background"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  reviews: integer("reviews").default(0),
  coursesCount: integer("courses_count").default(0),
  studentsCount: integer("students_count").default(0),
  featured: boolean("featured").default(false),
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  status: varchar("status", { length: 50 }).default("active"),
  institute: text("institute"),
  instituteId: integer("institute_id").references(() => institutes.id),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertTrainer = typeof trainers.$inferInsert;
export type SelectTrainer = typeof trainers.$inferSelect;

export const checkups = pgTable("checkups", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id),
  date: timestamp("date").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissionPolicies = pgTable("commission_policies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 강의 구매 테이블
export const coursePurchases = pgTable("course_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  purchaseAmount: decimal("purchase_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("completed"),
  paymentIntentId: text("payment_intent_id").unique(),
  accessGranted: boolean("access_granted").default(true),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  byCreatedAt: index("idx_course_purchases_created_at").on(t.createdAt),
}));

// 강의 수강 진행 상황 테이블
export const courseProgress = pgTable("course_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  currentLesson: integer("current_lesson").default(1),
  completedLessons: integer("completed_lessons").default(0),
  totalLessons: integer("total_lessons").notNull(),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0"),
  timeSpent: integer("time_spent").default(0), // 분 단위
  averageScore: decimal("average_score", { precision: 5, scale: 2 }).default("0"),
  lastAccessedAt: timestamp("last_accessed_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, paused
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 강의 진행 상황 공유 테이블
export const progressSharing = pgTable("progress_sharing", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // 견주
  courseId: integer("course_id").references(() => courses.id).notNull(),
  trainerId: integer("trainer_id").references(() => users.id), // 훈련사
  instituteId: integer("institute_id").references(() => institutes.id), // 기관
  sharedAt: timestamp("shared_at").defaultNow(),
  shareType: varchar("share_type", { length: 50 }).notNull(), // "trainer", "institute", "both"
  permissions: jsonb("permissions"), // 공유 권한 설정
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 강의 세션 기록 테이블
export const lessonSessions = pgTable("lesson_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  lessonNumber: integer("lesson_number").notNull(),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  watchTime: integer("watch_time").default(0), // 초 단위
  completionPercentage: decimal("completion_percentage", { precision: 5, scale: 2 }).default("0"),
  quiz_score: decimal("quiz_score", { precision: 5, scale: 2 }),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissionTransactions = pgTable("commission_transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settlementReports = pgTable("settlement_reports", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 20 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 상품별 수수료율 테이블
export const productCommissions = pgTable("product_commissions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  channelType: varchar("channel_type", { length: 50 }).default("all"), // 'all', 'direct', 'referral'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 추천인 프로필 테이블
export const referralProfiles = pgTable("referral_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  profileType: varchar("profile_type", { length: 50 }).notNull(), // 'trainer', 'institute', 'affiliate'
  defaultCommissionRate: decimal("default_commission_rate", { precision: 5, scale: 2 }).notNull().default("10"),
  lifetimeEarnings: decimal("lifetime_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'inactive', 'suspended'
  bankAccount: jsonb("bank_account"), // 계좌 정보
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 추천인 수익 내역 테이블
export const referralEarnings = pgTable("referral_earnings", {
  id: serial("id").primaryKey(),
  referralProfileId: integer("referral_profile_id").references(() => referralProfiles.id).notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'course', 'product', 'subscription'
  sourceId: integer("source_id").notNull(),
  sourceName: varchar("source_name", { length: 200 }),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("KRW"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'locked', 'settled', 'paid'
  settlementId: integer("settlement_id").references(() => settlements.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shopCategories = pgTable("shop_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});



export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  actionText: varchar("action_text", { length: 100 }), // 버튼 텍스트
  actionUrl: text("action_url"), // 클릭시 이동할 URL (linkUrl과 동일한 역할)
  linkUrl: text("link_url"), // 호환성을 위해 유지
  position: varchar("position", { length: 50 }).default("hero"), // hero, top, middle, bottom, sidebar
  type: varchar("type", { length: 50 }).default("main"), // main, promotion, announcement, event
  targetPosition: varchar("target_position", { length: 50 }).default("home-hero"), // 기존 필드 유지
  displayOrder: integer("display_order").default(0), // 표시 순서
  priority: integer("priority").default(5), // 우선순위 (1-10, 높을수록 우선)
  targetUserGroup: varchar("target_user_group", { length: 50 }).default("all"), // all, pet-owners, trainers, admins
  startDate: timestamp("start_date"), // 표시 시작일
  endDate: timestamp("end_date"), // 표시 종료일
  clickCount: integer("click_count").default(0), // 클릭 수
  viewCount: integer("view_count").default(0), // 노출 수
  impressionCount: integer("impression_count").default(0), // 노출 수 (viewCount와 동일)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 알림장 테이블 - 훈련사가 견주에게 보내는 훈련 알림
export const trainingJournals = pgTable("training_journals", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  petOwnerId: integer("pet_owner_id").references(() => users.id).notNull(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  trainingDate: timestamp("training_date").notNull(),
  trainingDuration: integer("training_duration"), // 훈련 시간 (분)
  trainingType: varchar("training_type", { length: 100 }), // 훈련 유형
  progressRating: integer("progress_rating"), // 진행도 평가 (1-5)
  behaviorNotes: text("behavior_notes"), // 행동 관찰 노트
  homeworkInstructions: text("homework_instructions"), // 집에서 할 숙제
  nextGoals: text("next_goals"), // 다음 목표
  attachments: text("attachments").array(), // 첨부파일 URL 배열
  isRead: boolean("is_read").default(false), // 견주 읽음 여부
  readAt: timestamp("read_at"),
  status: varchar("status", { length: 20 }).default("sent"), // sent, read, replied
  isAiDraft: boolean("is_ai_draft").default(false), // AI 초안에서 시작했는지 여부
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 알림장 공유 토큰 테이블 (PDF 외부 공유 링크)
export const notebookShareTokens = pgTable("notebook_share_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type NotebookShareToken = typeof notebookShareTokens.$inferSelect;

// 알림장 댓글 테이블 - 견주/훈련사의 양방향 응답
export const journalComments: any = pgTable("journal_comments", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachments: text("attachments").array(), // 첨부파일
  parentCommentId: integer("parent_comment_id"), // 대댓글 - 순환 참조 제거
  createdAt: timestamp("created_at").defaultNow(),
});

// 알림장 이모지 반응 테이블 - 사용자별 반응 (journal+user+emoji 유일)
export const journalReactions = pgTable("journal_reactions", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueReaction: uniqueIndex("journal_reactions_journal_user_emoji_uq").on(
    table.journalId, table.userId, table.emoji,
  ),
}));

// 알림장 댓글 신고 - 타인 댓글 신고
export const journalCommentReports = pgTable("journal_comment_reports", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").references(() => journalComments.id).notNull(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJournalCommentReportSchema = createInsertSchema(journalCommentReports).omit({
  id: true,
  reporterId: true,
  createdAt: true,
}).extend({
  reason: z.string().trim().max(500, '신고 사유는 최대 500자까지 입력할 수 있습니다').optional(),
});

export type JournalCommentReport = typeof journalCommentReports.$inferSelect;

// 알림장 사진/영상 첨부
export const notebookAttachments = pgTable("notebook_attachments", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  kind: varchar("kind", { length: 16 }).notNull(), // 'image' | 'video'
  storageKey: text("storage_key").notNull(),
  thumbnailKey: text("thumbnail_key"),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byJournal: index("idx_notebook_attachments_journal").on(t.journalId),
}));

export const insertNotebookAttachmentSchema = createInsertSchema(notebookAttachments).omit({
  id: true,
  createdAt: true,
});
export type NotebookAttachment = typeof notebookAttachments.$inferSelect;
export type InsertNotebookAttachment = z.infer<typeof insertNotebookAttachmentSchema>;

// 알림장 숙제 체크리스트 — 보호자가 집에서 수행할 액션 아이템
export const notebookHomeworkItems = pgTable("notebook_homework_items", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedByUserId: integer("completed_by_user_id").references(() => users.id),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byJournal: index("idx_notebook_homework_journal").on(t.journalId),
}));

export const insertNotebookHomeworkItemSchema = createInsertSchema(notebookHomeworkItems).omit({
  id: true,
  completedAt: true,
  completedByUserId: true,
  createdAt: true,
}).extend({
  label: z.string().trim().min(1, '숙제 내용을 입력해 주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  dueDate: z.union([z.string(), z.date(), z.null()]).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type NotebookHomeworkItem = typeof notebookHomeworkItems.$inferSelect;
export type InsertNotebookHomeworkItem = z.infer<typeof insertNotebookHomeworkItemSchema>;

// Bulk 입력(작성 시 한꺼번에 저장)
export const notebookHomeworkBulkSchema = z.object({
  items: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    dueDate: z.union([z.string(), z.null()]).optional(),
  })).max(50, '한 알림장에 최대 50개까지 추가할 수 있습니다'),
});

export const insertJournalCommentSchema = createInsertSchema(journalComments).omit({
  id: true,
  authorId: true,
  createdAt: true,
}).extend({
  content: z.string().trim().min(1, '댓글 내용을 입력해주세요').max(2000, '댓글은 최대 2000자까지 입력할 수 있습니다'),
});

export const insertJournalReactionSchema = createInsertSchema(journalReactions).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  emoji: z.string().min(1).max(16),
});

export type JournalReaction = typeof journalReactions.$inferSelect;
export type InsertJournalReaction = z.infer<typeof insertJournalReactionSchema>;

// 알림장 서비스 요청 테이블 - 견주가 추가 서비스 요청
export const journalServiceRequests = pgTable("journal_service_requests", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").references(() => trainingJournals.id).notNull(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  serviceType: varchar("service_type", { length: 50 }).notNull(), // consultation, message, booking
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  preferredDate: timestamp("preferred_date"),
  urgency: varchar("urgency", { length: 20 }).default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, completed
  responseMessage: text("response_message"),
  respondedBy: integer("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 휴식 신청 테이블 - 훈련사 개인 OFF 신청
export const restApplications = pgTable("rest_applications", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // personal, sick, family, vacation, etc.
  description: text("description"),
  substituteRequired: boolean("substitute_required").default(false),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, completed
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  // 대체 훈련사 관련
  substituteTrainerId: integer("substitute_trainer_id").references(() => users.id),
  substituteStatus: varchar("substitute_status", { length: 20 }).default("none"), // none, requested, confirmed, declined
  // 보상 관련
  rewardEligible: boolean("reward_eligible").default(false),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }),
  rewardStatus: varchar("reward_status", { length: 20 }).default("none"), // none, pending, approved, paid
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 대체 훈련사 요청 테이블 - 훈련소 관리자의 대체 인력 요청
export const substituteRequests = pgTable("substitute_requests", {
  id: serial("id").primaryKey(),
  restApplicationId: integer("rest_application_id").references(() => restApplications.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  requestingTrainerId: integer("requesting_trainer_id").references(() => users.id).notNull(),
  requiredSkills: text("required_skills").array(), // 필요한 스킬/자격증
  requiredLevel: varchar("required_level", { length: 20 }).default("same"), // same, higher, lower
  workingHours: varchar("working_hours", { length: 100 }),
  compensation: decimal("compensation", { precision: 10, scale: 2 }),
  additionalNotes: text("additional_notes"),
  status: varchar("status", { length: 20 }).default("open"), // open, in_progress, filled, cancelled
  // 매칭된 대체 훈련사
  matchedTrainerId: integer("matched_trainer_id").references(() => users.id),
  matchedAt: timestamp("matched_at"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 대체 훈련사 지원 테이블 - 다른 훈련사의 대체 근무 지원
export const substituteApplications = pgTable("substitute_applications", {
  id: serial("id").primaryKey(),
  substituteRequestId: integer("substitute_request_id").references(() => substituteRequests.id).notNull(),
  applicantTrainerId: integer("applicant_trainer_id").references(() => users.id).notNull(),
  availability: jsonb("availability"), // 근무 가능 시간/날짜
  experience: text("experience"), // 관련 경험
  certifications: text("certifications").array(), // 보유 자격증
  expectedCompensation: decimal("expected_compensation", { precision: 10, scale: 2 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected
  responseMessage: text("response_message"),
  respondedBy: integer("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 훈련소 전체 휴무 테이블 - 훈련소 관리자의 센터 단위 휴무
export const instituteClosure = pgTable("institute_closure", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  managerId: integer("manager_id").references(() => users.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // holiday, maintenance, event, etc.
  description: text("description"),
  notificationSent: boolean("notification_sent").default(false),
  customerNotice: text("customer_notice"),
  alternativeOptions: text("alternative_options"), // 대체 서비스 안내
  status: varchar("status", { length: 20 }).default("planned"), // planned, active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 휴식 리워드 테이블 - 소규모 훈련소 휴식 보상
export const restRewards = pgTable("rest_rewards", {
  id: serial("id").primaryKey(),
  restApplicationId: integer("rest_application_id").references(() => restApplications.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  rewardType: varchar("reward_type", { length: 50 }).notNull(), // points, cash, credit, voucher
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull(),
  rewardReason: text("reward_reason"),
  eligibilityChecked: boolean("eligibility_checked").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, paid, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions
export type UserRole = "admin" | "trainer" | "institute-admin" | "pet-owner";

export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Course = z.infer<typeof selectCourseSchema>;
export type NewCourse = z.infer<typeof insertCourseSchema>;

export type Institute = z.infer<typeof selectInstituteSchema>;
export type NewInstitute = z.infer<typeof insertInstituteSchema>;

export type Pet = z.infer<typeof selectPetSchema>;
export type NewPet = z.infer<typeof insertPetSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export type EventLocation = typeof eventLocations.$inferSelect;
export type InsertEventLocation = typeof eventLocations.$inferInsert;

export type EventAttendance = typeof eventAttendances.$inferSelect;


// Missing tables from error report
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  deadline: timestamp("deadline"),
  status: varchar("status", { length: 50 }).default("active"),
  clientId: integer("client_id").references(() => users.id),
  freelancerId: integer("freelancer_id").references(() => users.id),
  category: text("category"),
  views: integer("views").default(0),
  expectedStartDate: timestamp("expected_start_date"),
  location: text("location"),
  postedDate: timestamp("posted_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  freelancerId: integer("freelancer_id").references(() => users.id),
  title: text("title"),
  content: text("content"),
  proposedBudget: decimal("proposed_budget", { precision: 10, scale: 2 }),
  proposedTimeline: text("proposed_timeline"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  contractId: integer("contract_id"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  revieweeId: integer("reviewee_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  receiverId: integer("receiver_id").references(() => users.id),
  title: text("title"),
  content: text("content"),
  recommendation: text("recommendation"),
  status: text("status").default("pending"),
  reviewerRole: text("reviewer_role"),
  receiverRole: text("receiver_role"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").references(() => users.id).notNull(),
  participant2Id: integer("participant2_id").references(() => users.id).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  conversationId: integer("conversation_id").references(() => conversations.id),
  recipientId: integer("recipient_id").references(() => users.id),
  messageType: text("message_type").default("text"),
  attachments: text("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byCreatedAt: index("idx_messages_created_at").on(t.createdAt),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path"),
  isPublic: boolean("is_public").default(false),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  relatedEntity: text("related_entity"),
  relatedEntityId: integer("related_entity_id"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 기존 pointTransactions 제거됨 - 새로운 pointTransactions가 이미 위에 정의됨

export const forums = pgTable("forums", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  popularity: integer("popularity").default(0),
  weekday: text("weekday"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Banner = typeof banners.$inferSelect;

export type JournalComment = typeof journalComments.$inferSelect;
export type InsertJournalComment = typeof journalComments.$inferInsert;

export type JournalServiceRequest = typeof journalServiceRequests.$inferSelect;
export type InsertJournalServiceRequest = typeof journalServiceRequests.$inferInsert;

// 새로운 테이블들의 Zod 스키마
export const insertTrainerActivityLogSchema = createInsertSchema(trainerActivityLogs);
export const selectTrainerActivityLogSchema = createSelectSchema(trainerActivityLogs);
export const insertIncentivePaymentSchema = createInsertSchema(incentivePayments);
export const selectIncentivePaymentSchema = createSelectSchema(incentivePayments);
export const insertTrainerRankingSchema = createInsertSchema(trainerRankings);
export const selectTrainerRankingSchema = createSelectSchema(trainerRankings);
export const insertPointRuleSchema = createInsertSchema(pointRules);
export const selectPointRuleSchema = createSelectSchema(pointRules);
export const insertMonthlyPointSummarySchema = createInsertSchema(monthlyPointSummary);
export const selectMonthlyPointSummarySchema = createSelectSchema(monthlyPointSummary);
export const insertPointTransactionSchema = createInsertSchema(pointTransactions);
export const selectPointTransactionSchema = createSelectSchema(pointTransactions);

// 새로운 테이블들의 타입 정의
export type PointRule = typeof pointRules.$inferSelect;
export type InsertPointRule = typeof pointRules.$inferInsert;
export type MonthlyPointSummary = typeof monthlyPointSummary.$inferSelect;
export type InsertMonthlyPointSummary = typeof monthlyPointSummary.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;
export type TrainerActivityLog = typeof trainerActivityLogs.$inferSelect;
export type InsertTrainerActivityLog = typeof trainerActivityLogs.$inferInsert;
export type IncentivePayment = typeof incentivePayments.$inferSelect;
export type InsertIncentivePayment = typeof incentivePayments.$inferInsert;
export type TrainerRanking = typeof trainerRankings.$inferSelect;
export type InsertTrainerRanking = typeof trainerRankings.$inferInsert;

export type ContentApproval = typeof contentApprovals.$inferSelect;
export type InsertContentApproval = typeof contentApprovals.$inferInsert;

export type TrainerInstitute = typeof trainerInstitutes.$inferSelect;
export type InsertTrainerInstitute = typeof trainerInstitutes.$inferInsert;

export type Curriculum = typeof curriculums.$inferSelect;
export type InsertCurriculum = typeof curriculums.$inferInsert;

// 컨텐츠 승인 시스템 테이블
export const contentApprovals = pgTable("content_approvals", {
  id: serial("id").primaryKey(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // course, curriculum, product
  contentId: integer("content_id").notNull(), // 해당 컨텐츠 ID
  submitterId: integer("submitter_id").references(() => users.id).notNull(), // 제출자 (훈련사)
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  content: jsonb("content"), // 컨텐츠 상세 정보
  attachments: text("attachments").array(),
  
  // 승인 단계별 상태
  trainerStatus: varchar("trainer_status", { length: 20 }).default("submitted"), // submitted
  instituteStatus: varchar("institute_status", { length: 20 }).default("pending"), // pending, approved, rejected
  adminStatus: varchar("admin_status", { length: 20 }).default("pending"), // pending, approved, rejected
  
  // 승인자 정보
  instituteReviewerId: integer("institute_reviewer_id").references(() => users.id),
  adminReviewerId: integer("admin_reviewer_id").references(() => users.id),
  
  // 승인/거부 메시지
  instituteComment: text("institute_comment"),
  adminComment: text("admin_comment"),
  
  // 승인 날짜
  instituteReviewedAt: timestamp("institute_reviewed_at"),
  adminReviewedAt: timestamp("admin_reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사-기관 관계 테이블
export const trainerInstitutes = pgTable("trainer_institutes", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  role: varchar("role", { length: 50 }).default("trainer"), // trainer, head-trainer, supervisor
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, suspended
  joinDate: timestamp("join_date").defaultNow(),
  permissions: text("permissions").array(), // 권한 배열
  createdAt: timestamp("created_at").defaultNow(),
});

// 훈련사-사용자 매칭 테이블 (훈련사가 담당하는 일반 사용자)
export const trainerClientAssignments = pgTable("trainer_client_assignments", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  clientId: integer("client_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, active, completed, cancelled
  assignedAt: timestamp("assigned_at").defaultNow(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  serviceType: varchar("service_type", { length: 50 }), // training, consultation, behavior-correction
  notes: text("notes"),
  petId: integer("pet_id").references(() => pets.id), // 관련 반려동물
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사-기관 연결 신청 테이블 (기관관리자 승인 필요)
export const trainerInstituteApplications = pgTable("trainer_institute_applications", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  applicationMessage: text("application_message"),
  rejectionReason: text("rejection_reason"),
  appliedAt: timestamp("applied_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod 스키마
export const insertTrainerClientAssignmentSchema = createInsertSchema(trainerClientAssignments);
export const selectTrainerClientAssignmentSchema = createSelectSchema(trainerClientAssignments);
export type TrainerClientAssignment = typeof trainerClientAssignments.$inferSelect;
export type InsertTrainerClientAssignment = typeof trainerClientAssignments.$inferInsert;

export const insertTrainerInstituteApplicationSchema = createInsertSchema(trainerInstituteApplications);
export const selectTrainerInstituteApplicationSchema = createSelectSchema(trainerInstituteApplications);
export type TrainerInstituteApplication = typeof trainerInstituteApplications.$inferSelect;
export type InsertTrainerInstituteApplication = typeof trainerInstituteApplications.$inferInsert;

// 커리큘럼 테이블
export const curriculums = pgTable("curriculums", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id),
  targetLevel: varchar("target_level", { length: 50 }), // beginner, intermediate, advanced
  duration: integer("duration"), // 총 소요 시간 (시간)
  sessions: jsonb("sessions"), // 세션별 상세 내용
  prerequisites: text("prerequisites").array(),
  learningObjectives: text("learning_objectives").array(),
  materials: text("materials").array(),
  assessmentMethods: text("assessment_methods").array(),
  isPublic: boolean("is_public").default(false),
  status: varchar("status", { length: 20 }).default("draft"), // draft, pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 커리큘럼 Zod 스키마
export const insertCurriculumSchema = createInsertSchema(curriculums);
export const selectCurriculumSchema = createSelectSchema(curriculums);
export const updateCurriculumSchema = insertCurriculumSchema.partial().omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  creatorId: true, 
  instituteId: true  // Prevent ownership modification
});

// 훈련사 인증 신청 테이블
export const trainerApplications = pgTable("trainer_applications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  hasAffiliation: boolean("has_affiliation").default(false),
  affiliationName: varchar("affiliation_name", { length: 200 }),
  experience: text("experience"),
  education: text("education"),
  certifications: text("certifications"),
  motivation: text("motivation"),
  portfolioUrl: text("portfolio_url"),
  resume: text("resume"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, certified
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 기관 등록 신청 테이블
export const instituteApplications = pgTable("institute_applications", {
  id: serial("id").primaryKey(),
  instituteName: varchar("institute_name", { length: 200 }).notNull(),
  representativeName: varchar("representative_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  businessNumber: varchar("business_number", { length: 50 }),
  address: text("address").notNull(),
  website: text("website"),
  description: text("description"),
  certificationDocuments: text("certification_documents"),
  facilities: text("facilities"),
  trainerCount: integer("trainer_count").default(0),
  capacity: integer("capacity").default(0),
  programs: text("programs"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사 인증 기록 테이블
export const trainerCertifications = pgTable("trainer_certifications", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => trainerApplications.id),
  trainerId: integer("trainer_id").references(() => users.id),
  certificationLevel: varchar("certification_level", { length: 50 }).default("basic"), // basic, intermediate, advanced
  certificationNumber: varchar("certification_number", { length: 100 }).unique(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사 양성 과정 테이블
export const trainerPrograms = pgTable("trainer_programs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 50 }).notNull(), // beginner, intermediate, advanced
  duration: integer("duration"), // in hours
  price: decimal("price", { precision: 10, scale: 2 }),
  maxParticipants: integer("max_participants").default(20),
  currentParticipants: integer("current_participants").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  instructorId: integer("instructor_id").references(() => users.id),
  curriculum: jsonb("curriculum"),
  requirements: text("requirements"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 훈련사 양성 과정 등록 테이블
export const trainerProgramEnrollments = pgTable("trainer_program_enrollments", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => trainerPrograms.id),
  userId: integer("user_id").references(() => users.id),
  status: varchar("status", { length: 20 }).default("enrolled"), // enrolled, completed, dropped, failed
  progress: integer("progress").default(0), // percentage
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  certificate: text("certificate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert/Select 타입 정의
export type TrainerApplication = typeof trainerApplications.$inferSelect;
export type InsertTrainerApplication = typeof trainerApplications.$inferInsert;

export type InstituteApplication = typeof instituteApplications.$inferSelect;
export type InsertInstituteApplication = typeof instituteApplications.$inferInsert;

export type TrainerCertification = typeof trainerCertifications.$inferSelect;
export type InsertTrainerCertification = typeof trainerCertifications.$inferInsert;

export type TrainerProgram = typeof trainerPrograms.$inferSelect;
export type InsertTrainerProgram = typeof trainerPrograms.$inferInsert;

export type TrainerProgramEnrollment = typeof trainerProgramEnrollments.$inferSelect;
export type InsertTrainerProgramEnrollment = typeof trainerProgramEnrollments.$inferInsert;

// 휴식 관리 시스템 타입
export type RestApplication = typeof restApplications.$inferSelect;
export type InsertRestApplication = typeof restApplications.$inferInsert;

export type SubstituteRequest = typeof substituteRequests.$inferSelect;
export type InsertSubstituteRequest = typeof substituteRequests.$inferInsert;

export type SubstituteApplication = typeof substituteApplications.$inferSelect;
export type InsertSubstituteApplication = typeof substituteApplications.$inferInsert;

export type InstituteClosure = typeof instituteClosure.$inferSelect;
export type InsertInstituteClosure = typeof instituteClosure.$inferInsert;

export type RestReward = typeof restRewards.$inferSelect;
export type InsertRestReward = typeof restRewards.$inferInsert;

// 휴식 관리 시스템 Zod 스키마
export const insertRestApplicationSchema = createInsertSchema(restApplications);
export const selectRestApplicationSchema = createSelectSchema(restApplications);

export const insertSubstituteRequestSchema = createInsertSchema(substituteRequests);
export const selectSubstituteRequestSchema = createSelectSchema(substituteRequests);

export const insertSubstituteApplicationSchema = createInsertSchema(substituteApplications);
export const selectSubstituteApplicationSchema = createSelectSchema(substituteApplications);

export const insertInstituteClosureSchema = createInsertSchema(instituteClosure);
export const selectInstituteClosureSchema = createSelectSchema(instituteClosure);

export const insertRestRewardSchema = createInsertSchema(restRewards);
export const selectRestRewardSchema = createSelectSchema(restRewards);

// 상품 관련 타입 정의
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type ProductExposure = typeof productExposures.$inferSelect;
export type InsertProductExposure = typeof productExposures.$inferInsert;

export type ShoppingCart = typeof shoppingCarts.$inferSelect;
export type InsertShoppingCart = typeof shoppingCarts.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// 상품 관련 Zod 스키마
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);

export const insertProductExposureSchema = createInsertSchema(productExposures);
export const selectProductExposureSchema = createSelectSchema(productExposures);

export const insertShoppingCartSchema = createInsertSchema(shoppingCarts);
export const selectShoppingCartSchema = createSelectSchema(shoppingCarts);

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);

export const insertOrderItemSchema = createInsertSchema(orderItems);
export const selectOrderItemSchema = createSelectSchema(orderItems);

// 로고 관리 테이블
export const logoAssets = pgTable("logo_assets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'main_logo', 'compact_logo', 'symbol', 'favicon'
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  isActive: boolean("is_active").default(true),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  themeVariant: varchar("theme_variant", { length: 20 }).default("light"), // 'light', 'dark', 'auto'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 로고 관련 타입 정의
export type LogoAsset = typeof logoAssets.$inferSelect;
export type InsertLogoAsset = typeof logoAssets.$inferInsert;

// 로고 관련 Zod 스키마
export const insertLogoAssetSchema = createInsertSchema(logoAssets);
export const selectLogoAssetSchema = createSelectSchema(logoAssets);

// 훈련사 인증 등급 테이블
export const trainerTiers = pgTable("trainer_tiers", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  tier: varchar("tier", { length: 50 }).notNull().default("general"), // general, semi_certified, certified
  classCount: integer("class_count").default(0), // 누적 수업 횟수
  contentCount: integer("content_count").default(0), // 제작 콘텐츠 수
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.0"), // 팬 평점
  lastClassDate: timestamp("last_class_date"),
  certificationExamPassed: boolean("certification_exam_passed").default(false),
  substituteAgreementSigned: boolean("substitute_agreement_signed").default(false),
  educationCompleted: boolean("education_completed").default(false),
  specializedFields: text("specialized_fields").array(), // 전문 분야 배열
  availableTimeSlots: jsonb("available_time_slots"), // 가능한 시간대
  regionCoverage: text("region_coverage").array(), // 담당 가능 지역
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 대체 수업 게시판 테이블
export const substituteClassPosts = pgTable("substitute_class_posts", {
  id: serial("id").primaryKey(),
  originalTrainerId: integer("original_trainer_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => courses.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array(), // 필요한 스킬
  classDate: timestamp("class_date").notNull(),
  classTime: varchar("class_time", { length: 20 }).notNull(), // 예: "14:00-15:30"
  location: text("location"),
  isOnline: boolean("is_online").default(false),
  compensation: decimal("compensation", { precision: 10, scale: 2 }).notNull(),
  maxApplicants: integer("max_applicants").default(3),
  currentApplicants: integer("current_applicants").default(0),
  status: varchar("status", { length: 20 }).default("open"), // open, in_progress, closed, completed
  urgency: varchar("urgency", { length: 20 }).default("normal"), // low, normal, high, urgent
  studentCount: integer("student_count").default(1),
  studentAgeRange: varchar("student_age_range", { length: 50 }), // 예: "성인반", "아동반"
  specialRequirements: text("special_requirements"), // 특별 요구사항
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 대체 수업 신청 테이블
export const substituteClassApplications = pgTable("substitute_class_applications", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => substituteClassPosts.id).notNull(),
  applicantId: integer("applicant_id").references(() => users.id).notNull(),
  message: text("message"), // 신청 메시지
  proposedCompensation: decimal("proposed_compensation", { precision: 10, scale: 2 }), // 제안 수수료
  availableFrom: timestamp("available_from"),
  availableTo: timestamp("available_to"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected, completed
  applicationDate: timestamp("application_date").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 대체 수업 배정 테이블
export const substituteClassAssignments = pgTable("substitute_class_assignments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => substituteClassPosts.id).notNull(),
  originalTrainerId: integer("original_trainer_id").references(() => users.id).notNull(),
  substituteTrainerId: integer("substitute_trainer_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => courses.id).notNull(),
  agreedCompensation: decimal("agreed_compensation", { precision: 10, scale: 2 }).notNull(),
  classDate: timestamp("class_date").notNull(),
  classTime: varchar("class_time", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("assigned"), // assigned, in_progress, completed, cancelled
  assignedAt: timestamp("assigned_at").defaultNow(),
  classStartedAt: timestamp("class_started_at"),
  classCompletedAt: timestamp("class_completed_at"),
  originalTrainerNotes: text("original_trainer_notes"), // 원래 훈련사 전달사항
  substituteTrainerNotes: text("substitute_trainer_notes"), // 대체 훈련사 피드백
  studentFeedback: text("student_feedback"), // 학생 피드백
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"), // pending, paid, failed
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 대체 수업 매칭 로그 테이블
export const substituteMatchingLogs = pgTable("substitute_matching_logs", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => substituteClassPosts.id).notNull(),
  candidateTrainerId: integer("candidate_trainer_id").references(() => users.id).notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 매칭 점수
  matchingCriteria: jsonb("matching_criteria"), // 매칭 기준별 점수
  isRecommended: boolean("is_recommended").default(false),
  recommendationReason: text("recommendation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 대체 수업 알림 테이블
export const substituteClassNotifications = pgTable("substitute_class_notifications", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => substituteClassPosts.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // post_created, application_received, assignment_made, class_reminder, payment_complete
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 대체 훈련사 시스템 타입 정의
export type TrainerTier = typeof trainerTiers.$inferSelect;
export type InsertTrainerTier = typeof trainerTiers.$inferInsert;

export type SubstituteClassPost = typeof substituteClassPosts.$inferSelect;
export type InsertSubstituteClassPost = typeof substituteClassPosts.$inferInsert;

export type SubstituteClassApplication = typeof substituteClassApplications.$inferSelect;
export type InsertSubstituteClassApplication = typeof substituteClassApplications.$inferInsert;

export type SubstituteClassAssignment = typeof substituteClassAssignments.$inferSelect;
export type InsertSubstituteClassAssignment = typeof substituteClassAssignments.$inferInsert;

export type SubstituteMatchingLog = typeof substituteMatchingLogs.$inferSelect;
export type InsertSubstituteMatchingLog = typeof substituteMatchingLogs.$inferInsert;

export type SubstituteClassNotification = typeof substituteClassNotifications.$inferSelect;
export type InsertSubstituteClassNotification = typeof substituteClassNotifications.$inferInsert;

// 대체 훈련사 시스템 Zod 스키마
export const insertTrainerTierSchema = createInsertSchema(trainerTiers);
export const selectTrainerTierSchema = createSelectSchema(trainerTiers);

export const insertSubstituteClassPostSchema = createInsertSchema(substituteClassPosts);
export const selectSubstituteClassPostSchema = createSelectSchema(substituteClassPosts);

export const insertSubstituteClassApplicationSchema = createInsertSchema(substituteClassApplications);
export const selectSubstituteClassApplicationSchema = createSelectSchema(substituteClassApplications);

export const insertSubstituteClassAssignmentSchema = createInsertSchema(substituteClassAssignments);
export const selectSubstituteClassAssignmentSchema = createSelectSchema(substituteClassAssignments);

export const insertSubstituteMatchingLogSchema = createInsertSchema(substituteMatchingLogs);
export const selectSubstituteMatchingLogSchema = createSelectSchema(substituteMatchingLogs);

export const insertSubstituteClassNotificationSchema = createInsertSchema(substituteClassNotifications);
export const selectSubstituteClassNotificationSchema = createSelectSchema(substituteClassNotifications);

// 수수료 정책 테이블
export const feePolicies = pgTable("fee_policies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  feeType: varchar("fee_type", { length: 50 }).notNull(), // 'percentage', 'fixed', 'tiered'
  baseRate: decimal("base_rate", { precision: 5, scale: 2 }).notNull(), // 기본 수수료율 또는 금액
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }), // 최소 수수료
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }), // 최대 수수료
  tierConfig: jsonb("tier_config"), // 차등 수수료 설정
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'trainer', 'institute', 'all'
  targetId: integer("target_id"), // 특정 대상 ID (null이면 전체 적용)
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 거래 내역 테이블
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // 'course_payment', 'consultation', 'product_sale'
  referenceId: integer("reference_id").notNull(), // 강의, 상담, 상품 등의 ID
  referenceType: varchar("reference_type", { length: 50 }).notNull(), // 'course', 'consultation', 'product'
  payerId: integer("payer_id").notNull(), // 결제자 ID
  payeeId: integer("payee_id").notNull(), // 수취인 ID (훈련사/기관)
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(), // 총 결제금액
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).notNull(), // 수수료
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // 실 지급액
  currency: varchar("currency", { length: 3 }).default("KRW"),
  paymentMethod: varchar("payment_method", { length: 50 }), // 'card', 'bank_transfer', 'virtual_account'
  paymentProvider: varchar("payment_provider", { length: 50 }), // 'stripe', 'toss', 'kakao_pay'
  externalTransactionId: varchar("external_transaction_id", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  feePolicyId: integer("fee_policy_id").references(() => feePolicies.id),
  instituteId: integer("institute_id"), // 기관 거래인 경우
  metadata: jsonb("metadata"), // 추가 정보
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 정산 내역 테이블
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  settlementType: varchar("settlement_type", { length: 50 }).notNull(), // 'trainer', 'institute', 'referral'
  targetId: integer("target_id").notNull(), // 훈련사 또는 기관 ID
  targetName: varchar("target_name", { length: 200 }).notNull(),
  referralProfileId: integer("referral_profile_id").references(() => referralProfiles.id), // 추천인 정산인 경우
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalGrossAmount: decimal("total_gross_amount", { precision: 12, scale: 2 }).notNull(),
  totalFeeAmount: decimal("total_fee_amount", { precision: 12, scale: 2 }).notNull(),
  totalNetAmount: decimal("total_net_amount", { precision: 12, scale: 2 }).notNull(),
  transactionCount: integer("transaction_count").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'processing', 'completed', 'paid'
  bankAccount: jsonb("bank_account"), // 계좌 정보
  settlementDetails: jsonb("settlement_details"), // 상세 정산 내역
  approvedBy: integer("approved_by"), // 승인자 ID
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 정산 항목 테이블 (정산의 세부 항목들)
export const settlementItems = pgTable("settlement_items", {
  id: serial("id").primaryKey(),
  settlementId: integer("settlement_id").references(() => settlements.id).notNull(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(), // 'course', 'consultation', 'product'
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  feeRate: decimal("fee_rate", { precision: 5, scale: 2 }), // 적용된 수수료율
  createdAt: timestamp("created_at").defaultNow(),
});

// 타입 추출 
export type FeePolicy = typeof feePolicies.$inferSelect;
export type InsertFeePolicy = typeof feePolicies.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;
export type SettlementItem = typeof settlementItems.$inferSelect;
export type InsertSettlementItem = typeof settlementItems.$inferInsert;
export type ProductCommission = typeof productCommissions.$inferSelect;
export type InsertProductCommission = typeof productCommissions.$inferInsert;
export type ReferralProfile = typeof referralProfiles.$inferSelect;
export type InsertReferralProfile = typeof referralProfiles.$inferInsert;
export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = typeof referralEarnings.$inferInsert;

// AI 사용량 추적 테이블
export const aiUsageLog = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(), // openai, anthropic, gemini, perplexity
  model: varchar("model", { length: 100 }).notNull(), // gpt-4o, claude-3, gemini-1.5-pro 등
  requestType: varchar("request_type", { length: 50 }).notNull(), // chat, analysis, training, health 등
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  cost: decimal("cost", { precision: 10, scale: 6 }).default("0"), // 요청당 비용 (달러)
  requestData: jsonb("request_data"), // 요청 세부 정보
  responseStatus: varchar("response_status", { length: 20 }).default("success"), // success, error, timeout
  responseTime: integer("response_time"), // 밀리초
  createdAt: timestamp("created_at").defaultNow(),
});

// AI 사용량 일일 집계 테이블
export const aiDailySummary = pgTable("ai_daily_summary", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  userId: integer("user_id").references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(),
  totalRequests: integer("total_requests").default(0),
  totalTokens: integer("total_tokens").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0"),
  avgResponseTime: integer("avg_response_time"), // 평균 응답시간 (밀리초)
  errorCount: integer("error_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI 사용량 제한 설정 테이블
export const aiUsageLimits = pgTable("ai_usage_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userRole: varchar("user_role", { length: 50 }).notNull(), // pet-owner, trainer, institute-admin, admin
  dailyRequestLimit: integer("daily_request_limit").default(50),
  dailyCostLimit: decimal("daily_cost_limit", { precision: 10, scale: 2 }).default("5.00"),
  monthlyRequestLimit: integer("monthly_request_limit").default(1000),
  monthlyCostLimit: decimal("monthly_cost_limit", { precision: 10, scale: 2 }).default("100.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI 사용량 테이블 타입 추출
export type AiUsageLog = typeof aiUsageLog.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLog.$inferInsert;
export type AiDailySummary = typeof aiDailySummary.$inferSelect;
export type InsertAiDailySummary = typeof aiDailySummary.$inferInsert;
export type AiUsageLimits = typeof aiUsageLimits.$inferSelect;
export type InsertAiUsageLimits = typeof aiUsageLimits.$inferInsert;

// 알림 시스템 스키마 및 타입
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const updateNotificationSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다").optional(),
  message: z.string().min(1, "메시지는 필수입니다").max(1000, "메시지는 1000자를 초과할 수 없습니다").optional(),
  type: z.enum(["info", "success", "warning", "error", "course", "payment", "training", "reservation", "system", "marketing"], {
    errorMap: () => ({ message: "올바른 알림 타입을 선택해주세요" })
  }).optional(),
  isRead: z.boolean().optional(),
  actionUrl: z.string().url("올바른 URL 형식이 아닙니다").nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export const createNotificationSchema = z.object({
  userId: z.number().int().positive("올바른 사용자 ID가 필요합니다"),
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  message: z.string().min(1, "메시지는 필수입니다").max(1000, "메시지는 1000자를 초과할 수 없습니다"),
  type: z.enum(["info", "success", "warning", "error", "course", "payment", "training", "reservation", "system", "marketing", "message"], {
    errorMap: () => ({ message: "올바른 알림 타입을 선택해주세요" })
  }),
  category: z.enum(["message", "reservation", "payment", "system"]).optional(),
  isRead: z.boolean().default(false),
  actionUrl: z.string().url("올바른 URL 형식이 아닙니다").nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

// 알림 카테고리 정의 (UI용)
export const NOTIFICATION_CATEGORIES = ["message", "reservation", "payment", "system"] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

// 알림 타입 → 카테고리 매핑
export function getNotificationCategory(type: string): NotificationCategory {
  if (type === "message") return "message";
  if (["reservation", "course", "training"].includes(type)) return "reservation";
  if (type === "payment") return "payment";
  return "system";
}

// 알림 수신 설정 스키마
export const notificationPreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type UpsertNotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const selectNotificationSchema = createSelectSchema(notifications);

// 알림 조회 쿼리 스키마
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["info", "success", "warning", "error", "course", "payment", "training", "reservation", "system", "marketing", "message"]).optional(),
  category: z.enum(["message", "reservation", "payment", "system"]).optional(),
  isRead: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt", "title", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// 다중 알림 업데이트 스키마
export const bulkNotificationUpdateSchema = z.object({
  notificationIds: z.array(z.number().int().positive()).min(1, "적어도 하나의 알림을 선택해주세요"),
  updates: updateNotificationSchema,
});

// 알림 타입 정의
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof createNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type BulkNotificationUpdate = z.infer<typeof bulkNotificationUpdateSchema>;

// FCM 토큰 스키마 및 타입
export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectFcmTokenSchema = createSelectSchema(fcmTokens);

export type FcmToken = typeof fcmTokens.$inferSelect;
export type InsertFcmToken = z.infer<typeof insertFcmTokenSchema>;

// 푸시 캠페인 Zod 스키마
export const insertPushCampaignSchema = createInsertSchema(pushCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  totalRecipients: true,
  successCount: true,
  failureCount: true,
}).extend({
  title: z.string().min(1, "제목은 필수입니다").max(200),
  message: z.string().min(1, "메시지는 필수입니다"),
  targetType: z.enum(["all", "role", "segment", "topic"]),
  status: z.enum(["draft", "scheduled", "sending", "completed", "cancelled"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const selectPushCampaignSchema = createSelectSchema(pushCampaigns);
export type PushCampaign = typeof pushCampaigns.$inferSelect;
export type InsertPushCampaign = z.infer<typeof insertPushCampaignSchema>;

// 예약 푸시 알림 Zod 스키마
export const insertScheduledPushSchema = createInsertSchema(scheduledPushNotifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  errorMessage: true,
});

export const selectScheduledPushSchema = createSelectSchema(scheduledPushNotifications);
export type ScheduledPushNotification = typeof scheduledPushNotifications.$inferSelect;
export type InsertScheduledPush = z.infer<typeof insertScheduledPushSchema>;

// 푸시 발송 로그 Zod 스키마
export const insertPushLogSchema = createInsertSchema(pushNotificationLogs).omit({
  id: true,
  sentAt: true,
});

export const selectPushLogSchema = createSelectSchema(pushNotificationLogs);
export type PushNotificationLog = typeof pushNotificationLogs.$inferSelect;
export type InsertPushLog = z.infer<typeof insertPushLogSchema>;

// 훈련 일지 (알림장) Zod 스키마
export const insertTrainingJournalSchema = createInsertSchema(trainingJournals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  readAt: true,
  isRead: true,
  status: true, // 기본값 사용
}).extend({
  trainerId: z.number().int().positive("올바른 훈련사 ID가 필요합니다"),
  petOwnerId: z.number().int().positive("올바른 견주 ID가 필요합니다"),
  petId: z.number().int().positive("올바른 반려동물 ID가 필요합니다"),
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  content: z.string().min(1, "내용은 필수입니다").max(5000, "내용은 5000자를 초과할 수 없습니다"),
  trainingDate: z.string().min(1, "훈련 날짜는 필수입니다"),
  trainingDuration: z.number().int().min(1, "훈련 시간은 1분 이상이어야 합니다").max(480, "훈련 시간은 8시간을 초과할 수 없습니다").optional().nullable(),
  trainingType: z.string().max(100, "훈련 유형은 100자를 초과할 수 없습니다").optional().nullable(),
  progressRating: z.number().int().min(1, "평가는 1~5 사이여야 합니다").max(5, "평가는 1~5 사이여야 합니다").optional().nullable(),
  behaviorNotes: z.string().max(2000, "행동 관찰 노트는 2000자를 초과할 수 없습니다").optional().nullable(),
  homeworkInstructions: z.string().max(2000, "숙제 내용은 2000자를 초과할 수 없습니다").optional().nullable(),
  nextGoals: z.string().max(2000, "다음 목표는 2000자를 초과할 수 없습니다").optional().nullable(),
  attachments: z.array(z.string().url("올바른 URL 형식이 아닙니다")).optional().nullable().default([]),
  isAiDraft: z.boolean().optional(),
});

// AI 초안 생성 요청 스키마
export const notebookDraftRequestSchema = z.object({
  keywords: z.string().trim().min(2, "키워드는 2자 이상 입력해주세요").max(500, "키워드는 500자를 초과할 수 없습니다"),
  tone: z.enum(["friendly", "formal", "short", "detailed"]).default("friendly"),
  petId: z.coerce.number().int().positive().optional(),
  streamId: z.coerce.number().int().positive().optional(),
});
export type NotebookDraftRequest = z.infer<typeof notebookDraftRequestSchema>;

export const updateTrainingJournalSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다").optional(),
  content: z.string().min(1, "내용은 필수입니다").max(5000, "내용은 5000자를 초과할 수 없습니다").optional(),
  trainingDate: z.string().min(1, "훈련 날짜는 필수입니다").optional(),
  trainingDuration: z.number().int().min(1, "훈련 시간은 1분 이상이어야 합니다").max(480, "훈련 시간은 8시간을 초과할 수 없습니다").optional().nullable(),
  trainingType: z.string().max(100, "훈련 유형은 100자를 초과할 수 없습니다").optional().nullable(),
  progressRating: z.number().int().min(1, "평가는 1~5 사이여야 합니다").max(5, "평가는 1~5 사이여야 합니다").optional().nullable(),
  behaviorNotes: z.string().max(2000, "행동 관찰 노트는 2000자를 초과할 수 없습니다").optional().nullable(),
  homeworkInstructions: z.string().max(2000, "숙제 내용은 2000자를 초과할 수 없습니다").optional().nullable(),
  nextGoals: z.string().max(2000, "다음 목표는 2000자를 초과할 수 없습니다").optional().nullable(),
  attachments: z.array(z.string().url("올바른 URL 형식이 아닙니다")).optional().nullable(),
  isRead: z.boolean().optional(),
  status: z.enum(["sent", "read", "replied"]).optional()
});

export const selectTrainingJournalSchema = createSelectSchema(trainingJournals);

// 훈련 일지 조회 쿼리 스키마
export const trainingJournalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  petId: z.coerce.number().int().positive().optional(),
  trainerId: z.coerce.number().int().positive().optional(),
  petOwnerId: z.coerce.number().int().positive().optional(),
  trainingType: z.string().optional(),
  status: z.enum(["sent", "read", "replied"]).optional(),
  isRead: z.coerce.boolean().optional(),
  fromDate: z.string().optional(), // YYYY-MM-DD 형식
  toDate: z.string().optional(),   // YYYY-MM-DD 형식
  sortBy: z.enum(["trainingDate", "createdAt", "title", "progressRating"]).default("trainingDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// 미디어 업로드 스키마
export const trainingJournalMediaUploadSchema = z.object({
  journalId: z.number().int().positive("올바른 일지 ID가 필요합니다"),
  mediaType: z.enum(["image", "video"], {
    errorMap: () => ({ message: "이미지 또는 비디오만 업로드 가능합니다" })
  }),
  description: z.string().max(500, "설명은 500자를 초과할 수 없습니다").optional()
});

// 대량 일지 상태 업데이트 스키마
export const bulkTrainingJournalUpdateSchema = z.object({
  journalIds: z.array(z.number().int().positive()).min(1, "적어도 하나의 일지를 선택해주세요"),
  updates: z.object({
    isRead: z.boolean().optional(),
    status: z.enum(["sent", "read", "replied"]).optional()
  })
});

// 훈련 일지 타입 정의
export type TrainingJournal = typeof trainingJournals.$inferSelect;
export type InsertTrainingJournal = z.infer<typeof insertTrainingJournalSchema>;
export type UpdateTrainingJournal = z.infer<typeof updateTrainingJournalSchema>;
export type TrainingJournalQuery = z.infer<typeof trainingJournalQuerySchema>;
export type TrainingJournalMediaUpload = z.infer<typeof trainingJournalMediaUploadSchema>;
export type BulkTrainingJournalUpdate = z.infer<typeof bulkTrainingJournalUpdateSchema>;

// =============================================================================
// 배너 관련 스키마 및 타입 정의
// =============================================================================

// 배너 생성 스키마
export const insertBannerSchema = createInsertSchema(banners).omit({ 
  id: true, 
  clickCount: true, 
  viewCount: true, 
  createdAt: true, 
  updatedAt: true 
});

// 배너 수정 스키마
export const updateBannerSchema = insertBannerSchema.partial().extend({
  id: z.number().int().positive()
});

// 배너 조회 스키마
export const selectBannerSchema = createSelectSchema(banners);

// 배너 쿼리 스키마
export const bannerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  targetPosition: z.enum(["home-hero", "sidebar", "footer", "header", "content-top", "content-bottom"]).optional(),
  targetUserGroup: z.enum(["all", "pet-owners", "trainers", "admins"]).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["displayOrder", "createdAt", "title", "clickCount"]).default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// 배너 순서 변경 스키마
export const bannerReorderSchema = z.object({
  bannerId: z.number().int().positive(),
  newOrder: z.number().int().min(0),
  targetPosition: z.enum(["home-hero", "sidebar", "footer", "header", "content-top", "content-bottom"]).optional()
});

// 배너 통계 스키마
export const bannerAnalyticsSchema = z.object({
  bannerId: z.number().int().positive(),
  actionType: z.enum(["view", "click"]),
  userAgent: z.string().optional(),
  referrer: z.string().optional()
});

// 배너 대량 업데이트 스키마
export const bulkBannerUpdateSchema = z.object({
  bannerIds: z.array(z.number().int().positive()).min(1, "적어도 하나의 배너를 선택해주세요"),
  updates: z.object({
    isActive: z.boolean().optional(),
    targetPosition: z.enum(["home-hero", "sidebar", "footer", "header", "content-top", "content-bottom"]).optional(),
    displayOrder: z.number().int().min(0).optional()
  })
});

// 배너 타입 정의 (이미 존재하는 것 확장)
export type UpdateBanner = z.infer<typeof updateBannerSchema>;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type BannerQuery = z.infer<typeof bannerQuerySchema>;
export type BannerReorder = z.infer<typeof bannerReorderSchema>;
export type BannerAnalytics = z.infer<typeof bannerAnalyticsSchema>;
export type BulkBannerUpdate = z.infer<typeof bulkBannerUpdateSchema>;

// =============================================================================
// 로고 설정 테이블 - 전체 애플리케이션의 로고 표시 설정 관리
// =============================================================================

export const logoSettings = pgTable("logo_settings", {
  id: serial("id").primaryKey(),
  logoUrl: text("logo_url").notNull(),
  logoPosition: varchar("logo_position", { length: 20 }).notNull().default("left"), // left, center, right
  logoSize: varchar("logo_size", { length: 20 }).notNull().default("medium"), // small, medium, large
  altText: varchar("alt_text", { length: 200 }).notNull().default("로고"),
  linkUrl: text("link_url").default("/"), // 로고 클릭 시 이동할 URL
  maxWidth: integer("max_width").default(200), // 최대 너비 (px)
  maxHeight: integer("max_height").default(80), // 최대 높이 (px)
  showOnMobile: boolean("show_on_mobile").default(true),
  showOnDesktop: boolean("show_on_desktop").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 로고 설정 삽입 스키마
export const insertLogoSettingsSchema = createInsertSchema(logoSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 로고 설정 업데이트 스키마 - 비즈니스 로직과 검증 포함
export const updateLogoSettingsSchema = z.object({
  logoUrl: z.string().url("올바른 URL 형식이어야 합니다").min(1, "로고 URL은 필수입니다")
    .refine(url => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
      return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }, "이미지 파일 형식만 허용됩니다 (jpg, png, gif, svg, webp, bmp)"),
  logoPosition: z.enum(["left", "center", "right"], {
    errorMap: () => ({ message: "로고 위치는 left, center, right 중 하나여야 합니다" })
  }).default("left"),
  logoSize: z.enum(["small", "medium", "large"], {
    errorMap: () => ({ message: "로고 크기는 small, medium, large 중 하나여야 합니다" })
  }).default("medium"),
  altText: z.string().min(1, "대체 텍스트는 필수입니다").max(200, "대체 텍스트는 200자를 초과할 수 없습니다").default("로고"),
  linkUrl: z.string().url("올바른 URL 형식이어야 합니다").optional().default("/"),
  maxWidth: z.number().int().min(50, "최소 너비는 50px입니다").max(800, "최대 너비는 800px입니다").default(200),
  maxHeight: z.number().int().min(20, "최소 높이는 20px입니다").max(200, "최대 높이는 200px입니다").default(80),
  showOnMobile: z.boolean().default(true),
  showOnDesktop: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

// 로고 설정 조회 스키마
export const selectLogoSettingsSchema = createSelectSchema(logoSettings);

// 로고 설정 쿼리 스키마
export const logoSettingsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

// 로고 설정 타입 정의
export type LogoSettings = z.infer<typeof selectLogoSettingsSchema>;
export type InsertLogoSettings = z.infer<typeof insertLogoSettingsSchema>;
export type UpdateLogoSettings = z.infer<typeof updateLogoSettingsSchema>;
export type LogoSettingsQuery = z.infer<typeof logoSettingsQuerySchema>;

// =============================================================================
// 강의(Courses) 스키마 정의 - RBAC 보안 적용
// =============================================================================

// 강의 기본 스키마
export const insertCourseSchema = createInsertSchema(courses, {
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  description: z.string().max(5000, "설명은 5000자를 초과할 수 없습니다").optional().nullable(),
  content: z.string().max(10000, "내용은 10000자를 초과할 수 없습니다").optional().nullable(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "올바른 가격 형식이 아닙니다").optional().nullable(),
  duration: z.number().int().min(1, "강의 시간은 1분 이상이어야 합니다").optional().nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional().nullable(),
  category: z.string().max(100, "카테고리는 100자를 초과할 수 없습니다").optional().nullable(),
  imageUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable(),
  videoUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable()
}).omit({
  id: true,
  rating: true,
  enrollmentCount: true,
  createdAt: true,
  updatedAt: true
});

// 강의 수정 스키마 - 보안: instituteId, instructorId 보호
export const updateCourseSchema = insertCourseSchema.partial().omit({
  instituteId: true,    // 소유권 필드 보호 - RBAC Critical
  instructorId: true    // 소유권 필드 보호 - RBAC Critical
});

// 강의 조회 스키마
export const selectCourseSchema = createSelectSchema(courses);

// Additional course type definitions (avoiding duplicates)
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;

// =============================================================================
// 커뮤니티 게시글(Posts) 스키마 정의
// =============================================================================

// 게시글 기본 스키마
export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  content: z.string().min(1, "내용은 필수입니다"),
  category: z.string().max(100, "카테고리는 100자를 초과할 수 없습니다").optional(),
  postType: z.enum(["text", "video", "video_short", "link"]).default("text"),
  videoUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable(),
  videoThumbnail: z.string().url("올바른 URL 형식이 아닙니다").optional().nullable(),
  videoDuration: z.number().int().min(1, "영상 길이는 1초 이상이어야 합니다").optional().nullable(),
  videoFileSize: z.number().int().min(1, "파일 크기는 1byte 이상이어야 합니다").optional().nullable(),
}).omit({
  id: true,
  views: true,
  likes: true,
  commentsCount: true,
  createdAt: true,
  updatedAt: true
});

// 게시글 수정 스키마
export const updatePostSchema = insertPostSchema.partial().omit({
  authorId: true    // 작성자는 변경 불가
});

// 게시글 조회 스키마
export const selectPostSchema = createSelectSchema(posts);

// 댓글 스키마
export const insertCommentSchema = createInsertSchema(comments, {
  content: z.string().min(1, "댓글 내용은 필수입니다"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectCommentSchema = createSelectSchema(comments);

// 타입 정의
export type Post = z.infer<typeof selectPostSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type Comment = z.infer<typeof selectCommentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// =============================================================================
// 반려동물 알림장(Care Logs) 스키마 정의
// =============================================================================

// 알림장 생성 스키마
export const insertCareLogSchema = createInsertSchema(careLogs, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다"),
  note: z.string().max(5000, "메모는 5000자를 초과할 수 없습니다").optional().nullable(),
  poopStatus: poopStatusEnum.optional().nullable(),
  mealStatus: mealStatusEnum.optional().nullable(),
  walkStatus: walkStatusEnum.optional().nullable(),
  mood: moodEnum.optional().nullable(),
  energyLevel: z.number().int().min(1, "에너지 레벨은 1 이상이어야 합니다").max(5, "에너지 레벨은 5 이하여야 합니다").optional().nullable(),
  media: z.array(z.object({
    id: z.string(),
    url: z.string().url("올바른 URL 형식이어야 합니다"),
    type: z.enum(["image", "video"]),
    width: z.number().optional(),
    height: z.number().optional(),
    caption: z.string().optional()
  })).optional().nullable(),
  tags: z.array(z.string()).optional().nullable()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 알림장 수정 스키마
export const updateCareLogSchema = insertCareLogSchema.partial().omit({
  petId: true,  // 반려동물은 변경 불가
  userId: true  // 작성자는 변경 불가
});

// 알림장 조회 스키마
export const selectCareLogSchema = createSelectSchema(careLogs);

// =============================================================================
// AI 분석(AI Analyses) 스키마 정의
// =============================================================================

// AI 분석 요청 스키마
export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses, {
  inputLogIds: z.array(z.number().int()).min(1, "최소 1개의 알림장을 선택해야 합니다"),
  selectedSignals: z.object({
    text: z.boolean().default(true),
    poop: z.boolean().default(false),
    meal: z.boolean().default(false),
    walk: z.boolean().default(false),
    media: z.boolean().default(false)
  }),
  timeRange: z.string().optional().nullable(),
  model: z.string().max(50, "모델명은 50자를 초과할 수 없습니다").default("gpt-4o-mini"),
  resultJson: z.object({
    summary: z.string(),
    behavior: z.string().optional(),
    health: z.string().optional(),
    nutrition: z.string().optional(),
    activity: z.string().optional(),
    redFlags: z.array(z.string()).default([]),
    nextSteps: z.array(z.string()).default([])
  }),
  tokensIn: z.number().int().min(0, "입력 토큰 수는 0 이상이어야 합니다").optional().nullable(),
  tokensOut: z.number().int().min(0, "출력 토큰 수는 0 이상이어야 합니다").optional().nullable()
}).omit({
  id: true,
  createdAt: true
});

// AI 분석 조회 스키마
export const selectAiAnalysisSchema = createSelectSchema(aiAnalyses);

// 타입 정의
export type CareLog = z.infer<typeof selectCareLogSchema>;
export type InsertCareLog = z.infer<typeof insertCareLogSchema>;
export type UpdateCareLog = z.infer<typeof updateCareLogSchema>;
export type AiAnalysis = z.infer<typeof selectAiAnalysisSchema>;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;

// =============================================================================
// 예방접종(Vaccinations) 스키마 정의
// =============================================================================

// 백신 상태 enum
export const vaccinationStatusEnum = z.enum(["scheduled", "completed", "overdue", "cancelled"]);

// 예방접종 생성 스키마
export const insertVaccinationSchema = createInsertSchema(vaccinations, {
  vaccineName: z.string().min(1, "백신 종류는 필수입니다").max(100, "백신 종류는 100자를 초과할 수 없습니다"),
  vaccineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다"),
  status: vaccinationStatusEnum.default("scheduled"),
  hospitalName: z.string().max(200, "병원 이름은 200자를 초과할 수 없습니다").optional().nullable(),
  hospitalAddress: z.string().optional().nullable(),
  hospitalLatitude: z.string().optional().nullable(),
  hospitalLongitude: z.string().optional().nullable(),
  hospitalPhone: z.string().max(20, "전화번호는 20자를 초과할 수 없습니다").optional().nullable(),
  notes: z.string().max(1000, "메모는 1000자를 초과할 수 없습니다").optional().nullable(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다").optional().nullable(),
  reminderEnabled: z.boolean().default(true)
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 예방접종 수정 스키마
export const updateVaccinationSchema = insertVaccinationSchema.partial().omit({
  petId: true,  // 반려동물은 변경 불가
  userId: true  // 작성자는 변경 불가
});

// 예방접종 조회 스키마
export const selectVaccinationSchema = createSelectSchema(vaccinations);

// 타입 정의
export type Vaccination = z.infer<typeof selectVaccinationSchema>;
export type InsertVaccination = z.infer<typeof insertVaccinationSchema>;
export type UpdateVaccination = z.infer<typeof updateVaccinationSchema>;

// =============================================================================
// 미디어 분석(Pet Media Analysis) 스키마 정의
// =============================================================================

// 미디어 자산 테이블
export const petMediaAssets = pgTable("pet_media_assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  petId: integer("pet_id").notNull().references(() => pets.id),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(), // image/jpeg, image/png, video/mp4
  fileSize: integer("file_size"), // bytes
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // seconds for video
  thumbnailUrl: text("thumbnail_url"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// 미디어 분석 결과 테이블
export const petMediaAnalyses = pgTable("pet_media_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  petId: integer("pet_id").notNull().references(() => pets.id),
  mediaAssetId: integer("media_asset_id").notNull().references(() => petMediaAssets.id),
  model: varchar("model", { length: 50 }).notNull().default("gpt-4o"), // gpt-4o, gemini-2.5-flash, etc.
  memo: text("memo"), // optional user note
  resultJson: jsonb("result_json").notNull().$type<{
    summary: string;
    posture?: {
      score: number; // 0-100
      notes: string;
      keyFindings: string[];
    };
    behavior?: {
      observed: string[];
      concerns: string[];
      positive: string[];
    };
    health?: {
      status: string;
      warnings: string[];
      recommendations: string[];
    };
    issues?: string[];
    solutions?: string[];
  }>(),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 미디어 자산 생성 스키마
export const insertMediaAssetSchema = createInsertSchema(petMediaAssets, {
  fileUrl: z.string().url("올바른 URL 형식이어야 합니다"),
  fileType: z.string().regex(/^(image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|webm|mov))$/, "지원되지 않는 파일 형식입니다"),
  fileSize: z.number().int().positive("파일 크기는 양수여야 합니다").optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
}).omit({
  id: true,
  uploadedAt: true
});

// 미디어 분석 생성 스키마
export const insertMediaAnalysisSchema = createInsertSchema(petMediaAnalyses, {
  model: z.string().max(50, "모델명은 50자를 초과할 수 없습니다"),
  memo: z.string().max(1000, "메모는 1000자를 초과할 수 없습니다").optional(),
  resultJson: z.object({
    summary: z.string(),
    posture: z.object({
      score: z.number().min(0).max(100),
      notes: z.string(),
      keyFindings: z.array(z.string())
    }).optional(),
    behavior: z.object({
      observed: z.array(z.string()),
      concerns: z.array(z.string()),
      positive: z.array(z.string())
    }).optional(),
    health: z.object({
      status: z.string(),
      warnings: z.array(z.string()),
      recommendations: z.array(z.string())
    }).optional(),
    issues: z.array(z.string()).optional(),
    solutions: z.array(z.string()).optional()
  }),
  tokensIn: z.number().int().min(0).optional(),
  tokensOut: z.number().int().min(0).optional()
}).omit({
  id: true,
  createdAt: true
});

// 미디어 자산 조회 스키마
export const selectMediaAssetSchema = createSelectSchema(petMediaAssets);

// 미디어 분석 조회 스키마
export const selectMediaAnalysisSchema = createSelectSchema(petMediaAnalyses);

// 타입 정의
export type MediaAsset = z.infer<typeof selectMediaAssetSchema>;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAnalysis = z.infer<typeof selectMediaAnalysisSchema>;
export type InsertMediaAnalysis = z.infer<typeof insertMediaAnalysisSchema>;

// 라이브 스트리밍 테이블
export const liveStreams = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"), // training, qa, demo, etc.
  streamKey: varchar("stream_key", { length: 100 }).notNull().unique(),
  meetingUrl: text("meeting_url"), // Google Meet URL
  meetingCode: varchar("meeting_code", { length: 50 }),
  thumbnailUrl: text("thumbnail_url"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, live, ended, cancelled
  isPublic: boolean("is_public").default(true),
  maxViewers: integer("max_viewers").default(100),
  currentViewers: integer("current_viewers").default(0),
  peakViewers: integer("peak_viewers").default(0),
  totalViews: integer("total_views").default(0),
  scheduledStartTime: timestamp("scheduled_start_time"),
  actualStartTime: timestamp("actual_start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration").default(0), // seconds
  recordingUrl: text("recording_url"),
  chatEnabled: boolean("chat_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 라이브 스트리밍 시청자 테이블
export const streamViewers = pgTable("stream_viewers", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  userId: integer("user_id").references(() => users.id), // nullable for anonymous viewers
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  watchTime: integer("watch_time").default(0), // seconds
  isActive: boolean("is_active").default(true),
});

// 화상수업(라이브 스트리밍) 출석 기록 테이블 - 예약 기준 자동 출석 집계
export const liveSessionAttendance = pgTable("live_session_attendance", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  reservationId: integer("reservation_id").references(() => reservations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  totalSeconds: integer("total_seconds").default(0),
  status: varchar("status", { length: 20 }).default("joined"), // joined, left, ended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLiveSessionAttendanceSchema = createInsertSchema(liveSessionAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLiveSessionAttendance = z.infer<typeof insertLiveSessionAttendanceSchema>;
export type LiveSessionAttendance = typeof liveSessionAttendance.$inferSelect;

// 라이브 스트리밍 채팅 메시지 테이블
export const streamChatMessages = pgTable("stream_chat_messages", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isHighlighted: boolean("is_highlighted").default(false),
  isPinned: boolean("is_pinned").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 라이브 스트리밍 생성 스키마
export const insertLiveStreamSchema = createInsertSchema(liveStreams, {
  title: z.string().min(1, "제목을 입력해주세요").max(200, "제목은 200자 이내로 입력해주세요"),
  description: z.string().max(1000, "설명은 1000자 이내로 입력해주세요").optional(),
  category: z.enum(["general", "training", "qa", "demo", "consultation"]).optional(),
  maxViewers: z.number().int().min(1).max(1000).optional(),
  scheduledStartTime: z.coerce.date().optional(),
  isPublic: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  thumbnailUrl: z.string().optional(),
}).omit({
  id: true,
  hostId: true,
  streamKey: true,
  meetingUrl: true,
  meetingCode: true,
  currentViewers: true,
  peakViewers: true,
  totalViews: true,
  actualStartTime: true,
  endTime: true,
  duration: true,
  recordingUrl: true,
  createdAt: true,
  updatedAt: true,
});

// 시청자 생성 스키마
export const insertStreamViewerSchema = createInsertSchema(streamViewers).omit({
  id: true,
  joinedAt: true,
  leftAt: true,
  watchTime: true,
});

// 채팅 메시지 생성 스키마
export const insertStreamChatSchema = createInsertSchema(streamChatMessages, {
  message: z.string().min(1, "메시지를 입력해주세요").max(500, "메시지는 500자 이내로 입력해주세요"),
}).omit({
  id: true,
  isHighlighted: true,
  isPinned: true,
  isDeleted: true,
  createdAt: true,
});

// 라이브 스트리밍 타입 정의
export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type InsertStreamViewer = z.infer<typeof insertStreamViewerSchema>;
export type StreamChatMessage = typeof streamChatMessages.$inferSelect;
export type InsertStreamChatMessage = z.infer<typeof insertStreamChatSchema>;

// WebRTC 피어 연결 테이블 (P2P 시그널링용)
export const streamPeers = pgTable("stream_peers", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  peerId: varchar("peer_id", { length: 100 }).notNull(), // socket.io client id
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).notNull().default("viewer"), // host, viewer
  isConnected: boolean("is_connected").default(true),
  connectionQuality: varchar("connection_quality", { length: 20 }).default("good"), // good, fair, poor
  joinedAt: timestamp("joined_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// 스트림 녹화 메타데이터 테이블
export const streamRecordings = pgTable("stream_recordings", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url"),
  fileSize: integer("file_size").default(0), // bytes
  duration: integer("duration").default(0), // seconds
  format: varchar("format", { length: 20 }).default("webm"),
  status: varchar("status", { length: 20 }).default("processing"), // processing, ready, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// 스트림 분석 테이블
export const streamAnalytics = pgTable("stream_analytics", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => liveStreams.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // view, chat, like, share, leave
  userId: integer("user_id").references(() => users.id),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 스트림 스케줄 테이블
export const streamSchedules = pgTable("stream_schedules", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  streamId: integer("stream_id").references(() => liveStreams.id), // linked when stream starts
  createdAt: timestamp("created_at").defaultNow(),
});

// WebRTC 피어 생성 스키마
export const insertStreamPeerSchema = createInsertSchema(streamPeers).omit({
  id: true,
  joinedAt: true,
  lastSeen: true,
});

// 스트림 녹화 생성 스키마
export const insertStreamRecordingSchema = createInsertSchema(streamRecordings).omit({
  id: true,
  createdAt: true,
});

// 스트림 분석 생성 스키마
export const insertStreamAnalyticsSchema = createInsertSchema(streamAnalytics).omit({
  id: true,
  createdAt: true,
});

// 스트림 스케줄 생성 스키마
export const insertStreamScheduleSchema = createInsertSchema(streamSchedules, {
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.coerce.date(),
}).omit({
  id: true,
  hostId: true,
  reminderSent: true,
  streamId: true,
  createdAt: true,
});

// 추가 타입 정의
export type StreamPeer = typeof streamPeers.$inferSelect;
export type InsertStreamPeer = z.infer<typeof insertStreamPeerSchema>;
export type StreamRecording = typeof streamRecordings.$inferSelect;
export type InsertStreamRecording = z.infer<typeof insertStreamRecordingSchema>;
export type StreamAnalytics = typeof streamAnalytics.$inferSelect;
export type InsertStreamAnalytics = z.infer<typeof insertStreamAnalyticsSchema>;
export type StreamSchedule = typeof streamSchedules.$inferSelect;
export type InsertStreamSchedule = z.infer<typeof insertStreamScheduleSchema>;

// 매칭 요청 테이블
export const matchingRequests = pgTable("matching_requests", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id"),
  trainerName: text("trainer_name"),
  petId: integer("pet_id"),
  petName: text("pet_name"),
  petOwnerId: integer("pet_owner_id"),
  petOwnerName: text("pet_owner_name"),
  status: text("status").default("pending"), // pending, approved, rejected
  response: text("response"),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 등록 신청 테이블 (훈련사/기관)
export const registrationApplications = pgTable("registration_applications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'trainer' or 'institute'
  applicantInfo: jsonb("applicant_info").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
  rejectionReason: text("rejection_reason"),
});

// 매칭 요청 스키마 및 타입
export const insertMatchingRequestSchema = createInsertSchema(matchingRequests).omit({ id: true, createdAt: true });
export type InsertMatchingRequest = z.infer<typeof insertMatchingRequestSchema>;
export type MatchingRequest = typeof matchingRequests.$inferSelect;

// 등록 신청 스키마 및 타입
export const insertRegistrationApplicationSchema = createInsertSchema(registrationApplications).omit({ id: true, submittedAt: true });
export type InsertRegistrationApplication = z.infer<typeof insertRegistrationApplicationSchema>;
export type RegistrationApplication = typeof registrationApplications.$inferSelect;

// ==================== TALEZ 수익화 시스템 (YouTube형) ====================

// 참여 이벤트 테이블 - 조회, 시청시간, 좋아요 등 모든 활동 기록
export const engagementEvents = pgTable("engagement_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { length: 20 }).notNull(), // video, trainer, course, post, system
  targetId: integer("target_id"),
  eventType: varchar("event_type", { length: 30 }).notNull(), // view, watch, like, save, comment, follow, visit_store, answer_accepted
  value: decimal("value", { precision: 10, scale: 2 }).default("1"), // 시청 시간(초) 또는 기본값 1
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// TALEZ 점수 캐시 테이블 - 빠른 조회를 위한 점수 캐시
export const talezScoreCache = pgTable("talez_score_cache", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  ownerScore: decimal("owner_score", { precision: 10, scale: 2 }).default("0"),
  trainerScore: decimal("trainer_score", { precision: 10, scale: 2 }).default("0"),
  totalWatchSeconds: decimal("total_watch_seconds", { precision: 12, scale: 2 }).default("0"),
  totalViews: integer("total_views").default(0),
  totalLikes: integer("total_likes").default(0),
  totalComments: integer("total_comments").default(0),
  followerCount: integer("follower_count").default(0),
  violationCount: integer("violation_count").default(0),
  monetizationLevel: integer("monetization_level").default(0), // 0: 없음, 1: 광고 허용, 2: 유료 허용
  monetizationEnabled: boolean("monetization_enabled").default(false),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
});

// 월별 매출 테이블
export const monthlyRevenue = pgTable("monthly_revenue", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM 형식
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  adRevenue: decimal("ad_revenue", { precision: 15, scale: 2 }).default("0"),
  subscriptionRevenue: decimal("subscription_revenue", { precision: 15, scale: 2 }).default("0"),
  courseRevenue: decimal("course_revenue", { precision: 15, scale: 2 }).default("0"),
  consultationRevenue: decimal("consultation_revenue", { precision: 15, scale: 2 }).default("0"),
  otherRevenue: decimal("other_revenue", { precision: 15, scale: 2 }).default("0"),
  stage: varchar("stage", { length: 20 }).notNull().default("stage1"), // stage1, stage2, stage3
  platformShare: decimal("platform_share", { precision: 5, scale: 2 }).notNull(), // 플랫폼 비율 (60, 50, 40)
  trainerShare: decimal("trainer_share", { precision: 5, scale: 2 }).notNull(), // 훈련사 비율 (40, 50, 60)
  isSettled: boolean("is_settled").default(false),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 정산 내역 테이블
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  revenueId: integer("revenue_id").references(() => monthlyRevenue.id),
  userId: integer("user_id").notNull().references(() => users.id),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM 형식
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(), // 총 금액
  platformFee: decimal("platform_fee", { precision: 12, scale: 2 }).notNull(), // 플랫폼 수수료
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(), // 실수령액
  contributionScore: decimal("contribution_score", { precision: 10, scale: 2 }).notNull(), // 기여도 점수
  contributionRatio: decimal("contribution_ratio", { precision: 5, scale: 4 }).notNull(), // 기여 비율
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, failed
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 팔로우 관계 테이블
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// 수익화 설정 테이블
export const monetizationSettings = pgTable("monetization_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  value: json("value").$type<any>().notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 수익화 관련 스키마 및 타입
export const insertEngagementEventSchema = createInsertSchema(engagementEvents).omit({ id: true, createdAt: true });
export type InsertEngagementEvent = z.infer<typeof insertEngagementEventSchema>;
export type EngagementEvent = typeof engagementEvents.$inferSelect;

export const insertTalezScoreCacheSchema = createInsertSchema(talezScoreCache);
export type InsertTalezScoreCache = z.infer<typeof insertTalezScoreCacheSchema>;
export type TalezScoreCache = typeof talezScoreCache.$inferSelect;

export const insertMonthlyRevenueSchema = createInsertSchema(monthlyRevenue).omit({ id: true, createdAt: true });
export type InsertMonthlyRevenue = z.infer<typeof insertMonthlyRevenueSchema>;
export type MonthlyRevenue = typeof monthlyRevenue.$inferSelect;

export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true, createdAt: true });
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

// 첫 방문 상담 기록 테이블
export const consultationRecords = pgTable("consultation_records", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  instituteId: integer("institute_id").references(() => institutes.id),
  visitPurpose: text("visit_purpose").notNull(),
  mainProblemBehavior: text("main_problem_behavior").notNull(),
  behaviorTiming: text("behavior_timing"),
  behaviorTarget: text("behavior_target"),
  recentChanges: text("recent_changes"),
  walkDuration: varchar("walk_duration", { length: 100 }),
  mealPattern: text("meal_pattern"),
  ownerReactionStyle: text("owner_reaction_style"),
  previousTrainingExperience: text("previous_training_experience"),
  desiredGoal: text("desired_goal"),
  temperamentLevel: varchar("temperament_level", { length: 1 }),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConsultationRecordSchema = createInsertSchema(consultationRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsultationRecord = z.infer<typeof insertConsultationRecordSchema>;
export type ConsultationRecord = typeof consultationRecords.$inferSelect;

// 친구 초대 테이블
export const friendInvitations = pgTable("friend_invitations", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviter_id").notNull().references(() => users.id), // 초대한 사람
  inviteeEmail: varchar("invitee_email", { length: 255 }), // 초대받은 이메일
  inviteeId: integer("invitee_id").references(() => users.id), // 초대받은 사용자 (가입 후)
  inviteCode: varchar("invite_code", { length: 50 }).notNull(), // 초대 코드
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, expired
  acceptedAt: timestamp("accepted_at"), // 수락 일시
  createdAt: timestamp("created_at").defaultNow(),
});

// 교육 참여 크레딧 테이블
export const educationCredits = pgTable("education_credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 크레딧 소유자
  amount: integer("amount").notNull().default(1), // 크레딧 수량
  reason: varchar("reason", { length: 100 }).notNull(), // 획득 사유 (friend_invite, event, purchase 등)
  sourceId: integer("source_id"), // 관련 ID (초대ID, 이벤트ID 등)
  isUsed: boolean("is_used").default(false), // 사용 여부
  usedAt: timestamp("used_at"), // 사용 일시
  usedForCourseId: integer("used_for_course_id").references(() => courses.id), // 사용한 강의
  expiresAt: timestamp("expires_at"), // 만료 일시
  createdAt: timestamp("created_at").defaultNow(),
});

// QR 체크인 - 기관별 QR 코드 테이블
export const instituteQrCodes = pgTable("institute_qr_codes", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR 체크인 기록 테이블
export const checkinRecords = pgTable("checkin_records", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  qrCodeId: integer("qr_code_id").references(() => instituteQrCodes.id),
  ownerId: integer("owner_id").references(() => users.id),
  petId: integer("pet_id").references(() => pets.id),
  ownerName: varchar("owner_name", { length: 100 }),
  petName: varchar("pet_name", { length: 100 }),
  todayConcern: text("today_concern"),
  recentProblemBehavior: text("recent_problem_behavior"),
  todayGoal: text("today_goal"),
  nextReservationDate: date("next_reservation_date"),
  hasPackage: boolean("has_package").default(false),
  packageNote: text("package_note"),
  isNewVisitor: boolean("is_new_visitor").default(false),
  checkinAt: timestamp("checkin_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInstituteQrCodeSchema = createInsertSchema(instituteQrCodes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstituteQrCode = z.infer<typeof insertInstituteQrCodeSchema>;
export type InstituteQrCode = typeof instituteQrCodes.$inferSelect;

export const insertCheckinRecordSchema = createInsertSchema(checkinRecords).omit({ id: true, createdAt: true });
export type InsertCheckinRecord = z.infer<typeof insertCheckinRecordSchema>;
export type CheckinRecord = typeof checkinRecords.$inferSelect;

export const instituteZones = pgTable("institute_zones", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  zoneType: varchar("zone_type", { length: 50 }).notNull(),
  description: text("description"),
  requiresVaccination: boolean("requires_vaccination").default(false),
  maxTemperamentLevel: varchar("max_temperament_level", { length: 1 }),
  minTrainingLevel: varchar("min_training_level", { length: 50 }),
  capacity: integer("capacity"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInstituteZoneSchema = createInsertSchema(instituteZones).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstituteZone = z.infer<typeof insertInstituteZoneSchema>;
export type InstituteZone = typeof instituteZones.$inferSelect;

export const petVisitSessions = pgTable("pet_visit_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  memberId: integer("member_id").references(() => users.id).notNull(),
  petIds: jsonb("pet_ids").notNull(),
  vaccineStatus: jsonb("vaccine_status"),
  temperamentLevels: jsonb("temperament_levels"),
  zonePermissions: jsonb("zone_permissions"),
  petRegistrationInfo: jsonb("pet_registration_info"),
  reservationTime: timestamp("reservation_time"),
  deviceHash: varchar("device_hash", { length: 128 }),
  trainerLevel: varchar("trainer_level", { length: 50 }),
  todayConcern: text("today_concern"),
  todayGoal: text("today_goal"),
  singleUse: boolean("single_use").default(true),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  noseVerified: boolean("nose_verified").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPetVisitSessionSchema = createInsertSchema(petVisitSessions).omit({ id: true, createdAt: true });
export type InsertPetVisitSession = z.infer<typeof insertPetVisitSessionSchema>;
export type PetVisitSession = typeof petVisitSessions.$inferSelect;

// 친구 초대 스키마 및 타입
export const insertFriendInvitationSchema = createInsertSchema(friendInvitations).omit({ id: true, createdAt: true });
export type InsertFriendInvitation = z.infer<typeof insertFriendInvitationSchema>;
export type FriendInvitation = typeof friendInvitations.$inferSelect;

export const insertEducationCreditSchema = createInsertSchema(educationCredits).omit({ id: true, createdAt: true });
export type InsertEducationCredit = z.infer<typeof insertEducationCreditSchema>;
export type EducationCredit = typeof educationCredits.$inferSelect;

export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  contactName: varchar("contact_name", { length: 100 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 30 }).notNull(),
  relationship: varchar("relationship", { length: 50 }),
  designatedHospital: varchar("designated_hospital", { length: 200 }),
  hospitalPhone: varchar("hospital_phone", { length: 30 }),
  hospitalAddress: text("hospital_address"),
  emergencyTransportConsent: boolean("emergency_transport_consent").default(false),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;

export const storePolicies = pgTable("store_policies", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  leashRequired: boolean("leash_required").default(true),
  maxLeashLength: varchar("max_leash_length", { length: 20 }),
  noChairJumping: boolean("no_chair_jumping").default(true),
  sofaUsageAllowed: boolean("sofa_usage_allowed").default(false),
  otherDogContact: varchar("other_dog_contact", { length: 50 }).default("ask_first"),
  treatPolicy: varchar("treat_policy", { length: 50 }).default("provided_only"),
  outsideFoodAllowed: boolean("outside_food_allowed").default(false),
  childrenPolicy: varchar("children_policy", { length: 100 }),
  customRules: jsonb("custom_rules"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStorePolicySchema = createInsertSchema(storePolicies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStorePolicy = z.infer<typeof insertStorePolicySchema>;
export type StorePolicy = typeof storePolicies.$inferSelect;

export const consentRecords = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  petId: integer("pet_id").references(() => pets.id),
  instituteId: integer("institute_id").references(() => institutes.id),
  consentType: varchar("consent_type", { length: 50 }).notNull(),
  photoBeforeAfter: boolean("photo_before_after").default(false),
  snsUsage: boolean("sns_usage").default(false),
  faceHidden: boolean("face_hidden").default(false),
  petOnlyPhoto: boolean("pet_only_photo").default(false),
  caseCardNews: boolean("case_card_news").default(false),
  storePolicyAgreed: boolean("store_policy_agreed").default(false),
  emergencyTransportAgreed: boolean("emergency_transport_agreed").default(false),
  signatureData: text("signature_data"),
  consentDetails: jsonb("consent_details"),
  agreedAt: timestamp("agreed_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isRevoked: boolean("is_revoked").default(false),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({ id: true, createdAt: true });
export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecords.$inferSelect;

export const incidentProtocols = pgTable("incident_protocols", {
  id: serial("id").primaryKey(),
  instituteId: integer("institute_id").references(() => institutes.id).notNull(),
  incidentType: varchar("incident_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  steps: jsonb("steps").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIncidentProtocolSchema = createInsertSchema(incidentProtocols).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIncidentProtocol = z.infer<typeof insertIncidentProtocolSchema>;
export type IncidentProtocol = typeof incidentProtocols.$inferSelect;

export const petNoseProfiles = pgTable("pet_nose_profiles", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  images: jsonb("images").notNull(),
  representativeImageUrl: text("representative_image_url"),
  qualityScore: integer("quality_score"),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPetNoseProfileSchema = createInsertSchema(petNoseProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPetNoseProfile = z.infer<typeof insertPetNoseProfileSchema>;
export type PetNoseProfile = typeof petNoseProfiles.$inferSelect;

export const noseVerificationLogs = pgTable("nose_verification_logs", {
  id: serial("id").primaryKey(),
  visitSessionId: integer("visit_session_id").references(() => petVisitSessions.id),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  similarityScore: integer("similarity_score"),
  matched: boolean("matched").default(false),
  capturedImageUrl: text("captured_image_url"),
  failReason: text("fail_reason"),
  manualApproval: boolean("manual_approval").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  verifiedAt: timestamp("verified_at").defaultNow(),
});

export const insertNoseVerificationLogSchema = createInsertSchema(noseVerificationLogs).omit({ id: true, verifiedAt: true });
export type InsertNoseVerificationLog = z.infer<typeof insertNoseVerificationLogSchema>;
export type NoseVerificationLog = typeof noseVerificationLogs.$inferSelect;

// 코스 회차 (수업 차시) 테이블
export const courseSessions = pgTable("course_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  sessionNumber: integer("session_number").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date"),
  durationMinutes: integer("duration_minutes").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseSessionSchema = createInsertSchema(courseSessions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourseSession = z.infer<typeof insertCourseSessionSchema>;
export type CourseSession = typeof courseSessions.$inferSelect;

// 회차별 출석 기록 테이블
export const attendanceStatusEnum = z.enum(["present", "late", "absent", "scheduled"]);

export const sessionAttendance = pgTable("session_attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => courseSessions.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  petId: integer("pet_id").references(() => pets.id),
  status: varchar("status", { length: 20 }).default("scheduled"),
  memo: text("memo"),
  checkedBy: integer("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSessionAttendanceSchema = createInsertSchema(sessionAttendance).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSessionAttendance = z.infer<typeof insertSessionAttendanceSchema>;
export type SessionAttendance = typeof sessionAttendance.$inferSelect;

// 사용자 활성 세션 관리 테이블 (자동 로그아웃 / 다중 기기 관리)
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 64 }),
  deviceLabel: varchar("device_label", { length: 120 }),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedReason: varchar("revoked_reason", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// =============================================================================
// 이메일 알림 자동화 (SendGrid) - Task #24
// =============================================================================

// 이메일 템플릿 카테고리: welcome, booking_confirmed, lesson_reminder_d1,
//   payment_receipt, payment_failed, settlement_deadline
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  bodyHtml: text("body_html"),
  sendgridTemplateId: varchar("sendgrid_template_id", { length: 100 }),
  enabled: boolean("enabled").default(true),
  variables: jsonb("variables"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailNotificationPreferences = pgTable("email_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  templateKey: varchar("template_key", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 300 }),
  payload: jsonb("payload"),
  status: varchar("status", { length: 30 }).default("queued"), // queued, sent, failed, skipped
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  providerMessageId: varchar("provider_message_id", { length: 200 }),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const insertEmailPreferenceSchema = createInsertSchema(emailNotificationPreferences).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertEmailPreference = z.infer<typeof insertEmailPreferenceSchema>;
export type EmailPreference = typeof emailNotificationPreferences.$inferSelect;

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

export const EMAIL_CATEGORIES = [
  "welcome",
  "booking_confirmed",
  "lesson_reminder_d1",
  "payment_receipt",
  "payment_failed",
  "settlement_deadline",
  "review_request",
  "notebook_weekly_report",
  "notebook_monthly_report",
] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const notebookReportPreferences = pgTable("notebook_report_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  petId: integer("pet_id").references(() => pets.id).notNull(),
  weeklyEnabled: boolean("weekly_enabled").default(true),
  monthlyEnabled: boolean("monthly_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertNotebookReportPreferenceSchema = createInsertSchema(notebookReportPreferences).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertNotebookReportPreference = z.infer<typeof insertNotebookReportPreferenceSchema>;
export type NotebookReportPreference = typeof notebookReportPreferences.$inferSelect;

// 트레이너 정산 자동화 — 수수료율 정책
export const trainerCommissionRates = pgTable("trainer_commission_rates", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id), // null = 카테고리/전역 정책
  category: varchar("category", { length: 100 }), // null = 모든 카테고리
  ratePercent: decimal("rate_percent", { precision: 5, scale: 2 }).notNull().default("20"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainerCommissionRateSchema = createInsertSchema(trainerCommissionRates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrainerCommissionRate = z.infer<typeof insertTrainerCommissionRateSchema>;
export type TrainerCommissionRate = typeof trainerCommissionRates.$inferSelect;

// 트레이너 정산 항목
export const trainerSettlementItems = pgTable("trainer_settlement_items", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  sourceType: varchar("source_type", { length: 30 }).notNull(), // 'course', 'order', 'lesson'
  sourceId: integer("source_id").notNull(),
  sourceName: varchar("source_name", { length: 200 }),
  category: varchar("category", { length: 100 }),
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 12, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),
  // 정산 회계월 (YYYY-MM)
  settlementMonth: varchar("settlement_month", { length: 7 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending(예정), confirmed(확정), locked(마감), paid(지급), canceled(취소)
  settlementId: integer("settlement_id").references(() => settlements.id),
  occurredAt: timestamp("occurred_at").defaultNow(),
  canceledAt: timestamp("canceled_at"),
  cancelReason: text("cancel_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqSource: uniqueIndex("uniq_trainer_settlement_source").on(t.sourceType, t.sourceId),
  byTrainer: index("idx_trainer_settlement_items_trainer").on(t.trainerId),
  byMonth: index("idx_trainer_settlement_items_month").on(t.settlementMonth),
}));

export const insertTrainerSettlementItemSchema = createInsertSchema(trainerSettlementItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrainerSettlementItem = z.infer<typeof insertTrainerSettlementItemSchema>;
export type TrainerSettlementItem = typeof trainerSettlementItems.$inferSelect;

// =============================================================================
// 트레이너 리뷰 & 평점 시스템 (Task #19)
// =============================================================================

export const trainerReviews = pgTable("trainer_reviews", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  petId: integer("pet_id").references(() => pets.id),
  courseId: integer("course_id").references(() => courses.id),
  lessonRef: varchar("lesson_ref", { length: 100 }),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  photos: jsonb("photos").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).default("active"),
  hiddenReason: text("hidden_reason"),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  helpfulCount: integer("helpful_count").default(0),
  reportCount: integer("report_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainerReviewReplies = pgTable("trainer_review_replies", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => trainerReviews.id).notNull(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainerReviewReports = pgTable("trainer_review_reports", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => trainerReviews.id).notNull(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainerReviewSchema = createInsertSchema(trainerReviews, {
  rating: z.number().int().min(1).max(5),
  content: z.string().min(5).max(2000),
  title: z.string().max(200).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
}).omit({
  id: true,
  status: true,
  hiddenReason: true,
  moderatedBy: true,
  moderatedAt: true,
  helpfulCount: true,
  reportCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainerReviewReplySchema = createInsertSchema(trainerReviewReplies, {
  content: z.string().min(2).max(1000),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertTrainerReviewReportSchema = createInsertSchema(trainerReviewReports, {
  reason: z.enum(["spam", "abuse", "false_info", "privacy", "other"]),
  description: z.string().max(1000).optional(),
}).omit({ id: true, status: true, resolvedBy: true, resolvedAt: true, createdAt: true });

export type TrainerReview = typeof trainerReviews.$inferSelect;
export type InsertTrainerReview = z.infer<typeof insertTrainerReviewSchema>;
export type TrainerReviewReply = typeof trainerReviewReplies.$inferSelect;
export type InsertTrainerReviewReply = z.infer<typeof insertTrainerReviewReplySchema>;
export type TrainerReviewReport = typeof trainerReviewReports.$inferSelect;
export type InsertTrainerReviewReport = z.infer<typeof insertTrainerReviewReportSchema>;

// 콘텐츠/사용자 신고 테이블 (Task #50)
// Dedicated moderation tickets, separate from regular notifications.
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id),
  targetType: varchar("target_type", { length: 30 }).notNull(), // user, course, comment, post, product, content
  targetId: integer("target_id").notNull(),
  targetName: varchar("target_name", { length: 200 }),
  reportType: varchar("report_type", { length: 30 }).notNull().default("other"), // spam, inappropriate, harassment, fake, other
  reason: varchar("reason", { length: 200 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  status: varchar("status", { length: 20 }).default("pending"), // pending, investigating, resolved, dismissed
  assignedTo: integer("assigned_to").references(() => users.id),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionComment: text("resolution_comment"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentReportSchema = createInsertSchema(contentReports, {
  targetType: z.enum(["user", "course", "comment", "post", "product", "content"]),
  reportType: z.enum(["spam", "inappropriate", "harassment", "fake", "other"]).optional(),
  reason: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
}).omit({
  id: true,
  status: true,
  assignedTo: true,
  resolvedBy: true,
  resolvedAt: true,
  resolutionComment: true,
  createdAt: true,
  updatedAt: true,
});

export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;

// =============================================================================
// 관리자 감사 로그 (Audit Logs) - Task #11
// =============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id),
  actorRole: varchar("actor_role", { length: 50 }),
  actorName: varchar("actor_name", { length: 100 }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id", { length: 100 }),
  targetName: varchar("target_name", { length: 200 }),
  payload: jsonb("payload"),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("user_agent"),
  requestId: varchar("request_id", { length: 64 }),
  route: varchar("route", { length: 200 }),
  status: varchar("status", { length: 20 }).default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byActor: index("idx_audit_logs_actor").on(t.actorId),
  byAction: index("idx_audit_logs_action").on(t.action),
  byCreatedAt: index("idx_audit_logs_created_at").on(t.createdAt),
  byTarget: index("idx_audit_logs_target").on(t.targetType, t.targetId),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
