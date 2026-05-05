# TALEZ - Pet Education & E-commerce Platform

## Overview
TALEZ is an AI-powered pet education and e-commerce platform offering personalized training programs and pet-related products. It aims to integrate educational and retail solutions within the pet industry, targeting pet owners, professional trainers, and educational institutions for market leadership and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX Preferences: Enhanced font sizes and accessibility-focused design with improved touch targets and typography.

## System Architecture
### Core Architectural Decisions
TALEZ is built for modularity, scalability, and performance, leveraging modern web technologies to support multi-user roles, real-time interactions, and AI-driven personalized experiences. Key design choices include a consistent, accessibility-focused UI/UX with a simplified color palette, a hybrid location search system, robust authentication with role-based access control, and a custom WebRTC streaming solution. A comprehensive notification orchestrator manages real-time and background deliveries.

### Frontend
- **Framework**: React with TypeScript
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React hooks, context, TanStack Query
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Session Management**: Express session (PostgreSQL-backed)
- **Authentication**: Multi-provider with role-based access control (JWT, CSRF protection)
- **Real-time**: WebSocket service (Socket.IO for streaming)

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Validation**: Zod schemas

### Key Features
- **Authentication System**: Multi-provider (Native, Kakao, Naver, Google OAuth), secure session management, role-based access.
- **E-commerce Platform**: Product catalog, shopping cart, payment integration, order management.
- **Educational Services**: Course management, trainer profiles, pet profiles, AI-powered recommendations, curriculum creation, video management.
- **AI Features**: AI-powered pet training, content crawling, multi-model AI fusion (OpenAI, Gemini), automatic subtitle generation, pet nose biometric verification for check-ins, AI assistant for training journal drafting.
- **Admin Dashboard**: Comprehensive management for users, trainers, institutes, content, and revenue, with robust Role-Based Access Control.
- **Location Services**: Hybrid search system (TALEZ database + Google Places API) for pet-related establishments, Google Maps integration.
- **Design System**: Consistent UI/UX with enhanced typography, accessibility-focused design, unified button styles, simplified color palette.
- **Deployment Strategy**: Production-ready Docker containerization, PM2 cluster mode, Nginx reverse proxy, automated backup, GitHub Actions CI/CD for AWS EC2.
- **Vaccination Schedule Management**: CRUD system with hospital location, Google Maps integration, and notifications.
- **Live Streaming**: Custom WebRTC-based streaming system with Socket.IO for real-time interactions, chat, viewer tracking, and role-based access.
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration with WebSocket fallback.
- **Institute-Trainer Connection**: Secure system for trainers to link with institutes via unique codes.
- **Operational Policy System**: Manages emergency contacts, store policies, consent records, and incident protocols.
- **Pet Visit Trust & QR Check-in System**: Zone-based access control, single-use session tokens for pet visits, and a robust QR-based check-in CRM.
- **First Visit Consultation & Temperament Grading**: System for documenting initial pet consultations and assigning temperament grades.
- **Training Journal**: Comprehensive digital journal for pet training, including real-time API integration, notifications, two-way communication via comments and reactions, photo/video attachments, AI-powered drafting assistance, and homework checklists. Read receipts (보호자 열람 시 자동 readAt 1회 기록 + lastViewedAt 매 열람 갱신) are surfaced to trainers as 읽음/미읽음 chips on the journal list and detail, and as a sidebar 미읽음 N건 badge. Server-side search·filter (q/petId/from/to/category/unreadOnly) is exposed via GET /api/trainer/journals and GET /api/notebook/entries, with a shared NotebookFilterBar (URL-synced state, debounced search, chips, reset CTA) on both trainer and owner journal pages.
- **Notebook Templates**: Trainer-side reusable journal templates (CRUD/duplicate at `/trainer/notebook/templates`, "템플릿에서 시작" Select inside the create dialog auto-fills body→content, name→title, category→tags, homework items/note→notes). Personal + institute-shared + 5 system seed templates (첫 수업/주간 점검/노즈워크/사회화/마지막 수업). Free-edit after apply doesn't affect source. Backed by `notebookTemplates` (MemStorage) and `/api/notebook/templates` routes with requireAuth('trainer')+CSRF; `/api/notebook/templates/context` returns trainer userId + instituteIds for ownership/share UX.
- **Automated Reports**: Weekly and monthly training journal PDF reports automatically sent to pet owners via email, with customizable preferences and preview options.
- **Video Class Enhancements**: Post-class hooks for notifications and journal prompting, and refund wiring with settlement cancellation logic.
- **매장 QR 주문 (Offline Store QR Ordering)**: 테이블 QR로 고객이 모바일에서 메뉴를 주문하면, 관리자 태블릿 화면에 실시간(10초 폴링) 표시되고 직원이 포스기에 수기 입력하는 흐름. 결제·POS 연동 없음 (확인 다이얼로그에서 "결제는 카운터에서 진행해주세요"). 5개 카테고리(COFFEE/NON-COFFEE/SIGNATURE FOOD/BAR/SET MENU), 21개 시드 메뉴, 5단계 상태(pending→confirmed→preparing→served / cancelled). Tables: `storeMenuItems`, `storeOrders`, `storeOrderItems` (주문 시 메뉴명·가격 스냅샷). 주문번호 형식 `YYMMDD-NNNN`. Routes: 공개 `/customer/order` (모바일), 관리자 `/admin/store-orders`(주문 접수)·`/admin/store-menu`(메뉴 CRUD+품절 토글). API: `GET/POST /api/store/menu|orders` (공개), `GET/POST/PATCH/DELETE /api/admin/store/menu(/:id)`, `GET /api/admin/store/orders`, `PATCH /api/admin/store/orders/:id/status` (requireAuth('admin')+CSRF).

- **휴대폰 SMS 인증 (Twilio Verify)**: 이메일/비밀번호 회원가입 및 비밀번호 재설정 시 한국 휴대폰 번호 SMS 인증 (Twilio Verify Service). 소셜 로그인(Kakao/Naver/Google)은 영향 없음. E.164 정규화(+82), 60초 재발송 쿨다운, 휴대폰당 5회/일·IP당 20회/일 발송 제한, 10분간 5회 검증 시도 제한, 가입 시 중복 휴대폰 차단. Tables: `users.phone_verified_at`. Routes: `POST /api/auth/phone/send-code` · `/phone/verify-code` (가입용, 10분 JWT 발급) · `/api/auth/password-reset/send-code` · `/password-reset/verify-code` · `/password-reset/confirm` (account enumeration 방지를 위해 항상 동일 응답). 환경변수: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `PHONE_VERIFY_JWT_SECRET`(미설정 시 `JWT_SECRET` 폴백). 클라이언트: `/auth/register` 휴대폰+인증코드 UI, `/auth/forgot-password` & `/auth/reset-password`(SMS 코드 → 새 비밀번호) 페이지.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Email**: SendGrid
- **Payments**: Toss Payments, Stripe
- **Maps**: Google Maps API
- **AI Services**: OpenAI, Google Gemini
- **Monitoring**: Sentry
- **Authentication**: Kakao, Naver, Google (OAuth providers)
- **Avatars**: Dicebear API
- **Video Processing**: FFmpeg
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **WebRTC**: simple-peer
- **Real-time Communication**: Socket.IO