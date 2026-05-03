# TALEZ - Pet Education & E-commerce Platform

## Overview
TALEZ is a comprehensive pet education and e-commerce platform that integrates AI-powered pet training services with an online shopping experience. It aims to provide personalized training programs and convenient access to pet-related products for pet owners, professional trainers, and educational institutions. The platform's vision is to lead the pet industry with integrated educational and retail solutions powered by advanced technology, aiming for significant market penetration and a strong community presence.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX Preferences: Enhanced font sizes and accessibility-focused design with improved touch targets and typography.

## System Architecture
### Core Architectural Decisions
TALEZ is built for modularity, scalability, and performance using modern web technologies. The architecture supports multi-user roles, real-time interactions, and integrates AI capabilities for personalized experiences. Key design decisions include a consistent UI/UX with a simplified color palette, a hybrid location search system, robust authentication with role-based access control, and a custom WebRTC streaming solution. A comprehensive notification orchestrator handles real-time and background deliveries.

### Frontend
- **Framework**: React with TypeScript
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React hooks, context, TanStack Query
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Session Management**: Express session (PostgreSQL-backed)
- **Authentication**: Multi-provider with role-based access control (JWT, CSRF protection)
- **Real-time**: WebSocket service (Socket.IO for streaming)
- **Logging**: Winston for structured logging

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Migrations**: Drizzle Kit
- **Validation**: Zod schemas

### Key Features
- **Authentication System**: Multi-provider (Native, Kakao, Naver, Google OAuth), secure session management, role-based access. Simplified registration requires admin approval for non-social logins.
- **E-commerce Platform**: Product catalog, shopping cart, payment integration, order management.
- **Educational Services**: Course management, trainer profiles, pet profiles, AI-powered recommendations, curriculum creation, video management.
- **AI Features**: AI-powered pet training, content crawling, multi-model AI fusion (OpenAI, Gemini), automatic subtitle generation, pet nose biometric verification for check-ins.
- **Admin Dashboard**: Comprehensive management for users, trainers, institutes, content, revenue, and registrations, with robust Role-Based Access Control.
- **Location Services**: Hybrid search system (TALEZ database + Google Places API) for pet-related establishments, Google Maps integration.
- **Design System**: Consistent UI/UX with enhanced typography, accessibility-focused design, unified button styles, simplified color palette (TALEZ Green primary).
- **Deployment Strategy**: Production-ready Docker containerization, PM2 cluster mode, Nginx reverse proxy, automated backup, GitHub Actions CI/CD for AWS EC2.
- **Vaccination Schedule Management**: Comprehensive CRUD system with hospital location, Google Maps integration, and notifications.
- **Live Streaming**: Custom WebRTC-based streaming system with Socket.IO for real-time interactions, chat, viewer tracking, and role-based access.
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration with WebSocket fallback.
- **Institute-Trainer Connection**: Secure system for trainers to link with institutes via unique codes.
- **Optimized UI/UX**: Streamlined sidebar menus and role-specific quick action sections on the home screen.
- **Operational Policy System**: Manages emergency contacts, store policies, consent records, and incident protocols.
- **Pet Visit Trust & QR Check-in System**: Zone-based access control, single-use session tokens for pet visits, and a robust QR-based check-in CRM with check-in history and statistics.
- **First Visit Consultation & Temperament Grading**: System for documenting initial pet consultations and assigning temperament grades (A-E).
- **Nose Print Authentication (Apr 15)**: Pet nose print enrollment and verification system with `pet_nose_profiles` and `nose_verification_logs` tables. Memory-based upload for public endpoints (DoS prevention), rate limiting, and manual staff approval fallback.
- **Training Journal (알림장) – Real API & Notifications (May 03, 2026)**: Removed mock data from trainer notebook (`/trainer/notebook`) and pet-owner notebook (`/notebook`). Both pages now consume live `/api/trainer/journals`, `/api/trainer/students-for-journal`, and `/api/notebook/entries`. POST `/api/notebook/entries` triggers in-app notification (`notificationService`) and SendGrid email (`queueEmail` template `notebook_journal_created`) to the pet owner unless status is `draft`. Storage `createTrainingJournal` no longer forces `draft`. Added `getPetById` alias and fixed `canUserCreateTrainingJournal` to use `getPet`. New `POST /api/notebook/transcribe` (Whisper STT, trainer-only, 25MB cap, multer dest `uploads/notebook-stt/`).
- **Training Journal Comments & Reactions (May 03, 2026)**: Two-way 트레이너 ↔ 보호자 communication on every 알림장 entry. Backend: `journalReactions` table (schema), in-memory `journalComments`/`journalReactions` storage with toggle/delete/list helpers, 5 routes — `GET/POST /api/notebook/entries/:id/comments`, `DELETE /api/notebook/comments/:commentId`, `GET /api/notebook/comments/counts?ids=…`, `POST /api/notebook/entries/:id/reactions` — all gated by `requireAuth + csrfProtection + canUserAccessTrainingJournal` (delete = author/admin only). Comment POST fires `notificationService` (`type='message'`) to the opposite party with action link `/notebook?journalId=…` or `/trainer/notebook?journalId=…`. Allowed emojis: 👍 ❤️ 🎉 😍 👏 🐶. Frontend: shared `JournalCommentSection` component (TanStack Query, optimistic `setQueryData`, `secureRequest`) embedded in pet-owner `/notebook` detail dialog and trainer `/trainer/notebook` detail dialog. Persistence is in-memory (matches existing journal pattern); DB-backed migration tracked as follow-up.
- **Training Journal Photo/Video Attachments (May 03, 2026)**: Trainers can attach up to 5 images (10MB each, jpeg/png/webp/gif) and 1 video (≤60s, ≤50MB, mp4/webm/mov) per 알림장. Schema `notebookAttachments` table (journalId, kind, storageKey, thumbnailKey, sizeBytes, mimeType, sortOrder, uploadedBy) + index. ObjectStorage helpers `uploadBufferToPrivate / getPrivateFileByKey / deletePrivateByKey` save into `.private/notebook/<journalId>/{images|videos|thumbs}/<uuid>.<ext>`. Routes (reads gated by `requireAuth + canUserAccessTrainingJournal`; writes also require `canUserModifyTrainingJournal + csrfProtection`): `GET/POST /api/notebook/entries/:id/attachments`, `PATCH /api/notebook/entries/:id/attachments/reorder`, `DELETE /api/notebook/attachments/:id`, `GET /api/notebook/attachments/:id` & `/thumbnail`. The streaming endpoints perform authz then **302-redirect to a 5-minute GCS v4 signed URL** (browser fetches the bytes with Range directly from GCS); falls back to authenticated proxy stream with hardened Range parser (rejects reversed/out-of-bounds → 416) if signing fails. Multer memoryStorage with multer-error middleware mapping `LIMIT_FILE_SIZE`→413. Video upload pipeline: tmp write → ffprobe duration check (≤60s, else 400) → upload → fluent-ffmpeg first-frame thumbnail; tmp dir cleaned in `try/finally`. Shared `JournalAttachmentManager` component (TanStack Query, `secureRequest`, drag/drop + file picker, thumbnail grid with hover up/down arrows for reorder, lightbox with arrow-key nav, delete) embedded in trainer detail dialog (`canEdit=true`) and pet-owner detail dialog (`canEdit=false`). PDF export (`generateNotebookPdf`) downloads first 1–2 image attachments and embeds them under "훈련 사진" section side-by-side.
- **알림장 AI 작성 도우미 (May 03, 2026)**: Trainer-only `POST /api/notebook/draft` (`requireAuth('trainer') + csrfProtection`) takes `{ keywords, tone: friendly|formal|short|detailed, petId?, streamId? }`, builds context (pet name/breed via `storage.getPet`, last journal nextGoals, optional live stream title), calls OpenAI `gpt-4o-mini` with `response_format: json_object`, returns `{ draft: { title, content, behaviorNotes, homeworkInstructions, nextGoals }, usage: { used, limit, remaining } }`. Personal-info masking (phone/email/RRN) on every output field. Daily quota 30/trainer enforced via in-memory `Map<userId:YYYY-MM-DD, count>` (resets on restart but date-keyed); usage also recorded via `aiUsageService.logUsage({ requestType: 'notebook_draft' })`. PetId is authz-checked through `canUserCreateTrainingJournal`. Schema: added `isAiDraft boolean default false` to `trainingJournals` (db:push deferred — interactive prompts unrelated to this column; field flows through in-memory storage spread immediately) and `notebookDraftRequestSchema`. Frontend `client/src/pages/trainer/notebook.tsx`: AI tab rebuilt with keywords textarea + tone Select + generate button; on success fills title/content/behaviorNotes/homeworkInstructions/nextGoals, switches back to "basic" tab, displays remaining-quota counter. `createNotebookMutation` payload now includes `isAiDraft: true` when started from an AI draft (cleared after submit). Legacy `/api/notebook/ai-generate` left intact for backward compatibility.
- **알림장 숙제 체크리스트 (May 03, 2026)**: Trainer attaches homework items (label + optional dueDate) to each 알림장; pet owner toggles checkboxes to mark complete. Schema: `notebookHomeworkItems` (id, journalId, label, dueDate?, completed, completedAt?, completedBy?, sortOrder, createdAt) + `insertNotebookHomeworkItemSchema` + `notebookHomeworkBulkSchema`. In-memory storage `notebookHomeworkItems[]` (matches existing journals/comments/attachments pattern). Routes (server/routes.ts after reactions block): `GET/POST /api/notebook/entries/:id/homework`, `PATCH/DELETE /api/notebook/homework/:itemId`, `PATCH /api/notebook/homework/:itemId/complete`, `GET /api/notebook/homework/overdue-count` (owner), `GET /api/notebook/homework/weekly-stats` (trainer-only). All gated by `requireAuth + canUserAccessTrainingJournal`; writes additionally require `csrfProtection + canUserModifyTrainingJournal`. When toggling an item to completed and ALL items become completed (state transition), `notificationService` fires a `training` notification to the journal's trainer (action `/trainer/notebook?journalId=...`) — only when the toggling user is not the trainer. Component `JournalHomeworkChecklist` (TanStack Query, optimistic toggle, secureRequest, add/delete with `canEdit` gate, overdue red styling). Embedded in trainer detail dialog (`canEdit=true`) and pet-owner detail dialog (`canEdit=false`). Trainer create form has 숙제 체크리스트 input section in basic tab; on journal POST success bulk-POSTs draft homework. Trainer list cards display weekly completion-rate badge per pet (`주간 N%`). Pet-owner home `NotebookHomeCard` shows red `지연 숙제 N` badge from overdue-count endpoint.
- **Video Class (화상교육) – Post-class Hooks & Refund Wiring (May 03, 2026)**: `PATCH /api/live-streaming/streams/:id/end` now triggers `notificationService` for: (1) host(trainer) – `training` notification with action `/trainer/notebook?streamId=...` prompting journal creation, (2) all distinct logged-in viewers (`stream_viewers.userId`) – `training` notification with action `/live-streaming/:id/review` prompting feedback. Failures are isolated per recipient via try/catch + `logServerError`. `POST /api/toss/cancel` now optionally cascades to `cancelTrainerSettlementItem` when admin caller supplies `sourceType` ('course'|'order'|'lesson') and `sourceId`. Non-admin requests log the skip — settlement cascade is admin-gated until a `paymentKey → settlement source` mapping is added (avoids IDOR-style abuse on financial records). Audit log payload includes the source identifiers regardless. Remaining workstreams (reservation persistence beyond mock, attendance dedicated table, live room UX, recording, quality metrics dashboard) remain as follow-up tasks.

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