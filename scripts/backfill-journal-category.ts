import { db } from "../server/db";
import { trainingJournals } from "../shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";

const CATEGORIES = ["기본훈련", "행동교정", "사회화", "건강관리", "식습관", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

export function mapTrainingTypeToCategory(trainingType: string | null | undefined): Category {
  if (!trainingType) return "기타";
  const t = String(trainingType).trim().toLowerCase();
  if (!t) return "기타";

  const has = (...keys: string[]) => keys.some((k) => t.includes(k.toLowerCase()));

  if (has("behavioral_correction", "행동", "교정", "문제", "짖음", "물기", "공격")) {
    return "행동교정";
  }
  if (has("사회화", "socialization", "퍼피", "puppy")) {
    return "사회화";
  }
  if (has("건강", "health", "재활", "케어", "치료", "노령", "시니어")) {
    return "건강관리";
  }
  if (has("식습관", "식이", "사료", "급식", "food", "diet", "feeding")) {
    return "식습관";
  }
  if (has("basic", "advanced", "기본", "기초", "복종", "obedience", "어질리티", "agility", "클리커", "clicker", "훈련", "training")) {
    return "기본훈련";
  }
  return "기타";
}

export async function backfillJournalCategory(): Promise<{ updated: number; perCategory: Record<string, number> }> {
  const rows = await db
    .select({ id: trainingJournals.id, trainingType: trainingJournals.trainingType })
    .from(trainingJournals)
    .where(or(isNull(trainingJournals.category), eq(trainingJournals.category, "")));

  const perCategory: Record<string, number> = {};
  let updated = 0;

  for (const row of rows) {
    const category = mapTrainingTypeToCategory(row.trainingType);
    await db
      .update(trainingJournals)
      .set({ category })
      .where(and(eq(trainingJournals.id, row.id), or(isNull(trainingJournals.category), eq(trainingJournals.category, ""))));
    perCategory[category] = (perCategory[category] ?? 0) + 1;
    updated += 1;
  }

  return { updated, perCategory };
}

const isMain = (() => {
  try {
    const argvPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "";
    return import.meta.url === argvPath;
  } catch {
    return false;
  }
})();

if (isMain) {
  backfillJournalCategory()
    .then((result) => {
      console.log("[backfill-journal-category] 완료", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[backfill-journal-category] 실패", err);
      process.exit(1);
    });
}
