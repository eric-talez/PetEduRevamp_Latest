import type { Express } from "express";
import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
import { petNoseProfiles, noseVerificationLogs, petVisitSessions, pets, users, trainerInstitutes } from "../../shared/schema";
import { evaluateNoseImageQuality, compareNoseImages } from "../ai/openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logServerError } from '../middleware/audit-logger';

const verifyNoseRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function rateLimitVerifyNose(req: any, res: any, next: any) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const token = req.params.token || "no-token";
  const key = `${ip}:${token}`;
  const now = Date.now();

  const entry = verifyNoseRateLimit.get(key);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    entry.count++;
  } else {
    verifyNoseRateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  if (verifyNoseRateLimit.size > 10000) {
    for (const [k, v] of verifyNoseRateLimit) {
      if (v.resetAt <= now) verifyNoseRateLimit.delete(k);
    }
  }

  next();
}

const noseUploadDir = path.join(process.cwd(), ".private/uploads/nose");
if (!fs.existsSync(noseUploadDir)) {
  fs.mkdirSync(noseUploadDir, { recursive: true });
}

const noseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, noseUploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `nose-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadNose = multer({
  storage: noseStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."));
    }
  },
});

const uploadNoseMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."));
    }
  },
});

function requireAuth(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    let user = null;
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      user = req.user;
    } else if (req.session?.passport?.user) {
      user = req.session.passport.user;
      req.user = user;
    }

    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다." });
    }

    if (allowedRoles.length > 0) {
      const role = user.role || user.userRole;
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
    }

    return next();
  };
}

async function getUserInstituteId(user: any): Promise<number | null> {
  if (user.instituteId) return user.instituteId;
  const role = user.role || user.userRole;
  if (role === 'trainer') {
    const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
      .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, user.id)).limit(1);
    return trainerInst?.instituteId || null;
  }
  return null;
}

async function canAccessPet(user: any, petId: number): Promise<boolean> {
  const role = user.role || user.userRole;
  if (role === 'admin') return true;

  const [pet] = await db.select({ id: pets.id, ownerId: pets.ownerId }).from(pets).where(eq(pets.id, petId));
  if (!pet) return false;

  if (pet.ownerId === user.id) return true;

  if (['institute-admin', 'trainer'].includes(role)) {
    const userInstituteId = await getUserInstituteId(user);
    if (!userInstituteId) return false;

    const [visitLink] = await db.select({ id: petVisitSessions.id })
      .from(petVisitSessions)
      .where(
        and(
          eq(petVisitSessions.instituteId, userInstituteId),
          sql`${petVisitSessions.petIds}::jsonb @> ${JSON.stringify([petId])}::jsonb`
        )
      )
      .limit(1);
    return !!visitLink;
  }

  return false;
}

async function ensureNoseAuthTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pet_nose_profiles (
        id SERIAL PRIMARY KEY,
        pet_id INTEGER NOT NULL UNIQUE,
        images JSONB NOT NULL DEFAULT '[]',
        representative_image_url TEXT,
        quality_score INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nose_verification_logs (
        id SERIAL PRIMARY KEY,
        visit_session_id INTEGER NOT NULL,
        pet_id INTEGER NOT NULL,
        similarity_score INTEGER DEFAULT 0,
        matched BOOLEAN DEFAULT FALSE,
        captured_image_url TEXT,
        fail_reason TEXT,
        manual_approval BOOLEAN DEFAULT FALSE,
        approved_by INTEGER,
        verified_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pet_visit_sessions' AND column_name = 'nose_verified'
        ) THEN
          ALTER TABLE pet_visit_sessions ADD COLUMN nose_verified BOOLEAN DEFAULT FALSE;
        END IF;
      END $$
    `);
    console.log("[코 인증] 테이블 마이그레이션 완료");
  } catch (error) {
    logServerError("[코 인증] 테이블 마이그레이션 오류:", error);
  }
}

export function registerNoseAuthRoutes(app: Express) {
  ensureNoseAuthTables();

  app.get("/api/nose-images/:filename", requireAuth(), async (req: any, res) => {
    try {
      const filename = req.params.filename;
      if (!/^nose-\d+-\d+\.(jpg|jpeg|png|webp)$/.test(filename)) {
        return res.status(400).json({ error: "잘못된 파일명입니다." });
      }

      const sessionUser = req.user;
      const userRole = sessionUser?.role || sessionUser?.userRole;

      if (userRole !== 'admin') {
        const [profileMatch] = await db.select({ petId: petNoseProfiles.petId })
          .from(petNoseProfiles)
          .where(sql`${petNoseProfiles.images}::text LIKE ${'%' + filename + '%'}
            OR ${petNoseProfiles.representativeImageUrl} LIKE ${'%' + filename + '%'}`)
          .limit(1);

        const [logMatch] = !profileMatch
          ? await db.select({ petId: noseVerificationLogs.petId })
              .from(noseVerificationLogs)
              .where(sql`${noseVerificationLogs.capturedImageUrl} LIKE ${'%' + filename + '%'}`)
              .limit(1)
          : [null];

        const linkedPetId = profileMatch?.petId || logMatch?.petId;

        if (!linkedPetId) {
          return res.status(403).json({ error: "접근 권한이 없습니다." });
        }

        if (['institute-admin', 'trainer'].includes(userRole)) {
          const userInstituteId = await getUserInstituteId(sessionUser);
          if (!userInstituteId) {
            return res.status(403).json({ error: "소속 기관을 확인할 수 없습니다." });
          }
          const [visitLink] = await db.select({ id: petVisitSessions.id })
            .from(petVisitSessions)
            .where(and(
              eq(petVisitSessions.instituteId, userInstituteId),
              sql`${petVisitSessions.petIds}::jsonb @> ${JSON.stringify([linkedPetId])}::jsonb`
            ))
            .limit(1);
          if (!visitLink) {
            return res.status(403).json({ error: "접근 권한이 없습니다." });
          }
        } else {
          const [pet] = await db.select({ ownerId: pets.ownerId }).from(pets).where(eq(pets.id, linkedPetId));
          if (!pet || pet.ownerId !== sessionUser.id) {
            return res.status(403).json({ error: "접근 권한이 없습니다." });
          }
        }
      }

      const filePath = path.join(noseUploadDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "이미지를 찾을 수 없습니다." });
      }
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: "이미지 로드 실패" });
    }
  });

  app.post("/api/pets/:petId/nose/enroll", requireAuth(), uploadNose.array("images", 5), async (req: any, res) => {
    try {
      const petId = Number(req.params.petId);
      const sessionUser = req.user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });

      if (!(await canAccessPet(sessionUser, petId))) {
        return res.status(403).json({ error: "해당 반려동물에 대한 접근 권한이 없습니다." });
      }

      const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length < 3) {
        return res.status(400).json({ error: "최소 3장의 코 사진이 필요합니다. (3~5장 권장)" });
      }
      if (files.length > 5) {
        return res.status(400).json({ error: "최대 5장까지 업로드 가능합니다." });
      }

      const imageResults: Array<{ url: string; qualityScore: number; quality: any }> = [];

      for (const file of files) {
        const imageBase64 = fs.readFileSync(file.path).toString("base64");
        const quality = await evaluateNoseImageQuality(imageBase64);
        const imageUrl = `/api/nose-images/${file.filename}`;
        imageResults.push({ url: imageUrl, qualityScore: quality.overallScore, quality });
      }

      imageResults.sort((a, b) => b.qualityScore - a.qualityScore);
      const bestImage = imageResults[0];

      const existing = await db.select().from(petNoseProfiles).where(eq(petNoseProfiles.petId, petId));

      if (existing.length > 0) {
        await db.update(petNoseProfiles)
          .set({
            images: imageResults.map(r => ({ url: r.url, qualityScore: r.qualityScore })),
            representativeImageUrl: bestImage.url,
            qualityScore: bestImage.qualityScore,
            version: (existing[0].version || 1) + 1,
            updatedAt: new Date(),
          })
          .where(eq(petNoseProfiles.petId, petId));
      } else {
        await db.insert(petNoseProfiles).values({
          petId,
          images: imageResults.map(r => ({ url: r.url, qualityScore: r.qualityScore })),
          representativeImageUrl: bestImage.url,
          qualityScore: bestImage.qualityScore,
          version: 1,
        });
      }

      res.json({
        success: true,
        profile: {
          petId,
          representativeImageUrl: bestImage.url,
          qualityScore: bestImage.qualityScore,
          imageCount: imageResults.length,
          images: imageResults,
        },
      });
    } catch (error) {
      logServerError("[코 등록] 오류:", error, req);
      res.status(500).json({ error: "코 등록 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/pets/:petId/nose/profile", requireAuth(), async (req: any, res) => {
    try {
      const petId = Number(req.params.petId);
      const sessionUser = req.user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });

      if (!(await canAccessPet(sessionUser, petId))) {
        return res.status(403).json({ error: "해당 반려동물에 대한 접근 권한이 없습니다." });
      }

      const [profile] = await db.select().from(petNoseProfiles).where(eq(petNoseProfiles.petId, petId));

      if (!profile) {
        return res.json({ success: true, profile: null });
      }

      res.json({ success: true, profile });
    } catch (error) {
      logServerError("[코 프로필 조회] 오류:", error, req);
      res.status(500).json({ error: "코 프로필 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/visit-sessions/:token/verify-nose", rateLimitVerifyNose, uploadNoseMemory.single("image"), async (req: any, res) => {
    let savedPath: string | null = null;
    try {
      const sessionToken = req.params.token;

      const [session] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.token, sessionToken));
      if (!session) return res.status(404).json({ success: false, error: "방문 세션을 찾을 수 없습니다." });

      if (!session.usedAt) {
        return res.status(400).json({ success: false, error: "아직 체크인이 완료되지 않은 세션입니다." });
      }

      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, error: "만료된 세션입니다." });
      }

      const file = req.file as Express.Multer.File;
      if (!file || !file.buffer) return res.status(400).json({ success: false, error: "코 사진이 필요합니다." });

      const petIds = session.petIds as number[];
      if (!petIds || petIds.length === 0) {
        return res.status(400).json({ success: false, error: "방문 세션에 반려동물 정보가 없습니다." });
      }

      const requestedPetId = Number(req.body.petId) || petIds[0];

      if (!petIds.includes(requestedPetId)) {
        return res.status(400).json({ success: false, error: "해당 반려동물은 이 방문 세션에 포함되어 있지 않습니다." });
      }

      const [noseProfile] = await db.select().from(petNoseProfiles).where(eq(petNoseProfiles.petId, requestedPetId));
      if (!noseProfile) {
        return res.status(400).json({ success: false, error: "해당 반려동물의 코 프로필이 등록되지 않았습니다." });
      }

      const capturedBase64 = file.buffer.toString("base64");

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const savedFilename = `nose-${uniqueSuffix}.jpg`;
      savedPath = path.join(noseUploadDir, savedFilename);
      fs.writeFileSync(savedPath, file.buffer);
      const capturedImageUrl = `/api/nose-images/${savedFilename}`;

      let registeredBase64 = "";
      if (noseProfile.representativeImageUrl) {
        const filename = noseProfile.representativeImageUrl.split("/").pop() || "";
        const registeredPath = path.join(noseUploadDir, filename);
        if (fs.existsSync(registeredPath)) {
          registeredBase64 = fs.readFileSync(registeredPath).toString("base64");
        }
      }

      if (!registeredBase64) {
        try { fs.unlinkSync(savedPath); } catch {}
        return res.status(500).json({ success: false, error: "등록된 코 이미지를 불러올 수 없습니다." });
      }

      const comparison = await compareNoseImages(registeredBase64, capturedBase64);

      let status: "approved" | "retry" | "rejected";
      if (comparison.similarityScore >= 85) {
        status = "approved";
      } else if (comparison.similarityScore >= 75) {
        status = "retry";
      } else {
        status = "rejected";
      }

      const isApproved = status === "approved";

      await db.insert(noseVerificationLogs).values({
        visitSessionId: session.id,
        petId: requestedPetId,
        similarityScore: Math.round(comparison.similarityScore),
        matched: isApproved,
        capturedImageUrl,
        failReason: !isApproved ? (comparison.failReason || comparison.details) : null,
      });

      if (isApproved) {
        await db.update(petVisitSessions)
          .set({ noseVerified: true })
          .where(eq(petVisitSessions.id, session.id));
      }

      res.json({
        success: true,
        status,
        similarityScore: Math.round(comparison.similarityScore),
        matched: isApproved,
        details: comparison.details,
        failReason: !isApproved ? comparison.failReason : undefined,
      });
    } catch (error) {
      logServerError("[코 인증] 오류:", error, req);
      if (savedPath) {
        try { fs.unlinkSync(savedPath); } catch {}
      }
      res.status(500).json({ success: false, error: "코 인증 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/visit-sessions/:sessionId/manual-approve-nose", requireAuth('admin', 'institute-admin', 'trainer'), async (req: any, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const sessionUser = req.user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });

      const [session] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.id, sessionId));
      if (!session) return res.status(404).json({ error: "방문 세션을 찾을 수 없습니다." });

      const userRole = sessionUser.role || sessionUser.userRole;
      if (userRole !== 'admin') {
        const userInstituteId = await getUserInstituteId(sessionUser);
        if (!userInstituteId) {
          return res.status(403).json({ error: "소속 기관을 확인할 수 없습니다." });
        }
        if (userInstituteId !== session.instituteId) {
          return res.status(403).json({ error: "다른 기관의 세션을 승인할 수 없습니다." });
        }
      }

      await db.update(petVisitSessions)
        .set({ noseVerified: true })
        .where(eq(petVisitSessions.id, sessionId));

      const petIds = session.petIds as number[];
      const petId = Number(req.body.petId) || (petIds.length > 0 ? petIds[0] : 0);

      await db.insert(noseVerificationLogs).values({
        visitSessionId: sessionId,
        petId,
        similarityScore: 0,
        matched: true,
        manualApproval: true,
        approvedBy: sessionUser.id,
        failReason: null,
      });

      res.json({ success: true, message: "수동 승인이 완료되었습니다." });
    } catch (error) {
      logServerError("[수동 승인] 오류:", error, req);
      res.status(500).json({ error: "수동 승인 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/visit-sessions/:token/manual-approve-nose-by-token", requireAuth('admin', 'institute-admin', 'trainer'), async (req: any, res) => {
    try {
      const sessionToken = req.params.token;
      const sessionUser = req.user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });

      const [session] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.token, sessionToken));
      if (!session) return res.status(404).json({ error: "방문 세션을 찾을 수 없습니다." });

      const userRole = sessionUser.role || sessionUser.userRole;
      if (userRole !== 'admin') {
        const userInstituteId = await getUserInstituteId(sessionUser);
        if (!userInstituteId) {
          return res.status(403).json({ error: "소속 기관을 확인할 수 없습니다." });
        }
        if (userInstituteId !== session.instituteId) {
          return res.status(403).json({ error: "다른 기관의 세션을 승인할 수 없습니다." });
        }
      }

      await db.update(petVisitSessions)
        .set({ noseVerified: true })
        .where(eq(petVisitSessions.id, session.id));

      const petIds = session.petIds as number[];
      const petId = Number(req.body.petId) || (petIds.length > 0 ? petIds[0] : 0);

      await db.insert(noseVerificationLogs).values({
        visitSessionId: session.id,
        petId,
        similarityScore: 0,
        matched: true,
        manualApproval: true,
        approvedBy: sessionUser.id,
        failReason: null,
      });

      res.json({ success: true, message: "수동 승인이 완료되었습니다." });
    } catch (error) {
      logServerError("[수동 승인(토큰)] 오류:", error, req);
      res.status(500).json({ error: "수동 승인 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/nose-verification/logs", requireAuth('admin', 'institute-admin', 'trainer'), async (req: any, res) => {
    try {
      const sessionUser = req.user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });

      const userRole = sessionUser.role || sessionUser.userRole;
      const petId = req.query.petId ? Number(req.query.petId) : undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      let instituteScope: number | null = null;
      if (userRole !== 'admin') {
        instituteScope = await getUserInstituteId(sessionUser);
        if (!instituteScope) {
          return res.status(403).json({ error: "소속 기관을 확인할 수 없습니다." });
        }
      }

      let whereClause;
      if (petId) {
        whereClause = eq(noseVerificationLogs.petId, petId);
      }

      const logsQuery = db.select({
        id: noseVerificationLogs.id,
        visitSessionId: noseVerificationLogs.visitSessionId,
        petId: noseVerificationLogs.petId,
        similarityScore: noseVerificationLogs.similarityScore,
        matched: noseVerificationLogs.matched,
        capturedImageUrl: noseVerificationLogs.capturedImageUrl,
        failReason: noseVerificationLogs.failReason,
        manualApproval: noseVerificationLogs.manualApproval,
        verifiedAt: noseVerificationLogs.verifiedAt,
        petName: pets.name,
      })
        .from(noseVerificationLogs)
        .leftJoin(pets, eq(noseVerificationLogs.petId, pets.id));

      let logs;
      if (instituteScope) {
        logs = await logsQuery
          .innerJoin(petVisitSessions, eq(noseVerificationLogs.visitSessionId, petVisitSessions.id))
          .where(whereClause
            ? and(whereClause, eq(petVisitSessions.instituteId, instituteScope))
            : eq(petVisitSessions.instituteId, instituteScope)
          )
          .orderBy(desc(noseVerificationLogs.verifiedAt))
          .limit(limit);
      } else {
        logs = await logsQuery
          .where(whereClause)
          .orderBy(desc(noseVerificationLogs.verifiedAt))
          .limit(limit);
      }

      const totalLogs = logs.length;
      const successCount = logs.filter(l => l.matched).length;
      const failCount = totalLogs - successCount;
      const manualCount = logs.filter(l => l.manualApproval).length;

      res.json({
        success: true,
        logs,
        stats: {
          total: totalLogs,
          success: successCount,
          fail: failCount,
          manualApproval: manualCount,
          successRate: totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 0,
        },
      });
    } catch (error) {
      logServerError("[코 인증 로그] 오류:", error, req);
      res.status(500).json({ error: "인증 로그 조회 중 오류가 발생했습니다." });
    }
  });

  console.log("[코 인증] Nose Print Authentication API가 등록되었습니다.");
}
