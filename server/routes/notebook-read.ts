import type { Express, Request, RequestHandler, Response } from "express";
import { storage } from "../storage";
import { logServerError } from "../middleware/audit-logger";

export type RequireAuthFactory = (...allowedRoles: string[]) => RequestHandler;

interface SessionUser {
  id: number;
  role: string;
}

interface RequestWithSession extends Request {
  session: Request["session"] & { user?: SessionUser };
}

function currentUser(req: RequestWithSession): SessionUser | undefined {
  return req.session?.user;
}

export function registerNotebookReadRoutes(
  app: Express,
  requireAuth: RequireAuthFactory,
) {
  app.patch(
    "/api/notebook/entries/:id/read",
    requireAuth(),
    (req: Request, res: Response) => {
      const r = req as RequestWithSession;
      const journalId = Number.parseInt(r.params.id, 10);

      if (Number.isNaN(journalId)) {
        return res.status(400).json({
          success: false,
          error: "올바른 일지 ID가 필요합니다.",
          code: "INVALID_JOURNAL_ID",
        });
      }

      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({
          success: false,
          error: "해당 훈련 일지를 찾을 수 없습니다.",
          code: "JOURNAL_NOT_FOUND",
        });
      }

      const user = currentUser(r);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "인증이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (user.role !== "pet-owner") {
        return res.status(403).json({
          success: false,
          error: "알림장 읽음 처리는 보호자만 가능합니다.",
          code: "OWNER_ONLY",
        });
      }

      if (journal.petOwnerId !== user.id) {
        return res.status(403).json({
          success: false,
          error: "본인의 알림장만 읽음 처리할 수 있습니다.",
          code: "OWNER_ONLY",
        });
      }

      try {
        const result = storage.markJournalRead(journalId);
        if (!result) {
          return res.status(404).json({
            success: false,
            error: "해당 훈련 일지를 찾을 수 없습니다.",
            code: "JOURNAL_NOT_FOUND",
          });
        }
        return res.json({ success: true, data: result });
      } catch (error) {
        logServerError("알림장 읽음 처리 오류:", error, r);
        return res.status(500).json({
          success: false,
          error: "알림장 읽음 처리 중 오류가 발생했습니다.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );

  app.get(
    "/api/trainer/journals/unread-count",
    requireAuth("trainer"),
    (req: Request, res: Response) => {
      const r = req as RequestWithSession;
      try {
        const trainerId = currentUser(r)!.id;
        const count = storage.getUnreadJournalCountForTrainer(trainerId);
        return res.json({ success: true, count });
      } catch (error) {
        logServerError("훈련사 미읽음 알림장 카운트 오류:", error, r);
        return res.status(500).json({
          success: false,
          error: "미읽음 알림장 카운트 조회 중 오류가 발생했습니다.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );
}
