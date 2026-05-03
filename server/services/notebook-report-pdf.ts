import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type {
  NotebookComment,
  NotebookHomeworkItem,
  NotebookJournal,
  NotebookOwner,
  NotebookPet,
} from "./notebook-report-types";

const FONT_PATH = path.join(process.cwd(), "server", "assets", "fonts", "NotoSansKR-Regular.ttf");
const FONT_NAME = "NotoSansKR";
const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public", "logo-symbol-new.png"),
  path.join(process.cwd(), "public", "logo-192.png"),
  path.join(process.cwd(), "public", "logo.svg"),
];

let cachedFontBuffer: Buffer | null = null;
function loadFont(): Buffer | null {
  if (cachedFontBuffer) return cachedFontBuffer;
  try {
    if (fs.existsSync(FONT_PATH)) {
      cachedFontBuffer = fs.readFileSync(FONT_PATH);
      return cachedFontBuffer;
    }
  } catch (err) {
    console.warn("[Notebook Report PDF] 한글 폰트 로드 실패:", err);
  }
  return null;
}

let cachedLogoBuffer: Buffer | null = null;
let logoLookupDone = false;
function loadLogo(): Buffer | null {
  if (logoLookupDone) return cachedLogoBuffer;
  logoLookupDone = true;
  for (const p of LOGO_CANDIDATES) {
    try {
      if (fs.existsSync(p) && /\.png$/i.test(p)) {
        cachedLogoBuffer = fs.readFileSync(p);
        return cachedLogoBuffer;
      }
    } catch {/* noop */}
  }
  return null;
}

export interface NotebookReportPdfData {
  periodType: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  pet: NotebookPet;
  owner: NotebookOwner;
  journals: NotebookJournal[];
  homeworkItems: NotebookHomeworkItem[];
  comments?: NotebookComment[];
  trainerNames?: string[];
}

function safeText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatDateShort(value: unknown): string {
  if (!value) return "-";
  try {
    const d = new Date(value as string | number | Date);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return String(value); }
}

function truncate(s: string, n: number): string {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function generateNotebookReportPdf(data: NotebookReportPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: `알림장 ${data.periodType === "weekly" ? "주간" : "월간"} 리포트 - ${data.pet?.name ?? ""}`,
          Author: "Talez",
          Subject: "Notebook Periodic Report",
        },
      });

      const fontBuffer = loadFont();
      if (fontBuffer) {
        doc.registerFont(FONT_NAME, fontBuffer);
        doc.font(FONT_NAME);
      }
      const logoBuffer = loadLogo();

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.on("pageAdded", () => {
        if (fontBuffer) doc.font(FONT_NAME);
      });

      const periodLabel = data.periodType === "weekly" ? "주간" : "월간";
      const periodRange = `${formatDateShort(data.periodStart)} ~ ${formatDateShort(data.periodEnd)}`;
      const sectionWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ---- 표지 (로고 + 펫 이름 + 기간 + 트레이너) ----
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, doc.page.margins.left + sectionWidth / 2 - 28, doc.y, { width: 56, height: 56 });
          doc.y += 64;
        } catch {/* 잘못된 이미지면 패스 */}
      }
      doc.fillColor("#0F766E").fontSize(26).text(`${data.pet?.name ?? "반려동물"} ${periodLabel} 알림장 리포트`, { align: "center" });
      doc.moveDown(0.4);
      doc.fillColor("#374151").fontSize(11).text(periodRange, { align: "center" });
      doc.moveDown(0.2);
      const trainerLine = (data.trainerNames && data.trainerNames.length > 0)
        ? `담당 트레이너: ${data.trainerNames.join(", ")}`
        : "담당 트레이너: -";
      doc.fillColor("#374151").fontSize(10).text(trainerLine, { align: "center" });
      doc.moveDown(0.2);
      doc.fillColor("#6B7280").fontSize(9).text(`발행일: ${formatDateShort(new Date())}  ·  Talez`, { align: "center" });
      doc.moveDown(1.2);

      // ---- 요약 ----
      const totalJournals = data.journals.length;
      const trainerCount = data.trainerNames?.length ?? new Set(data.journals.map(j => j.trainerId).filter(Boolean)).size;
      const totalHomework = data.homeworkItems.length;
      const completedHomework = data.homeworkItems.filter(h => h.completed).length;
      const completionRate = totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0;

      doc.save();
      doc.rect(doc.page.margins.left, doc.y, sectionWidth, 80).fill("#F0FDFA");
      doc.restore();
      const summaryY = doc.y + 12;
      doc.fillColor("#0F766E").fontSize(12).text("이번 기간 요약", doc.page.margins.left + 16, summaryY);
      doc.fillColor("#111827").fontSize(10);
      doc.text(`• 총 알림장: ${totalJournals}건`, doc.page.margins.left + 16, summaryY + 22);
      doc.text(`• 참여 트레이너: ${trainerCount}명`, doc.page.margins.left + 16, summaryY + 38);
      doc.text(`• 숙제 완료율: ${completedHomework}/${totalHomework} (${completionRate}%)`, doc.page.margins.left + 16, summaryY + 54);
      doc.y = summaryY + 80;
      doc.moveDown(1);

      // ---- 숙제 완료 차트 ----
      if (totalHomework > 0) {
        doc.fillColor("#111827").fontSize(13).text("숙제 완료율");
        doc.moveDown(0.4);
        const barX = doc.page.margins.left;
        const barY = doc.y;
        const barWidth = sectionWidth;
        const barHeight = 18;
        doc.save();
        doc.rect(barX, barY, barWidth, barHeight).fill("#E5E7EB");
        doc.rect(barX, barY, Math.round(barWidth * (completionRate / 100)), barHeight).fill("#10B981");
        doc.restore();
        doc.fillColor("#111827").fontSize(9).text(`${completionRate}%`, barX, barY + barHeight + 4);
        doc.y = barY + barHeight + 22;
      }

      // ---- 알림장 리스트 ----
      doc.moveDown(0.5);
      doc.fillColor("#111827").fontSize(13).text("알림장 목록");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#374151");

      if (totalJournals === 0) {
        doc.fillColor("#9CA3AF").text("이번 기간 작성된 알림장이 없습니다.");
      } else {
        const sorted = [...data.journals].sort((a, b) => {
          const ad = new Date(a.trainingDate || a.createdAt || 0).getTime();
          const bd = new Date(b.trainingDate || b.createdAt || 0).getTime();
          return ad - bd;
        });
        sorted.forEach((j, idx) => {
          const cardHeight = 90;
          if (doc.y + cardHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
          const cy = doc.y;
          doc.save();
          doc.rect(doc.page.margins.left, cy, sectionWidth, cardHeight).fill("#FAFAFA");
          doc.restore();
          doc.fillColor("#0F766E").fontSize(11)
            .text(`${idx + 1}. ${truncate(safeText(j.title), 60)}`, doc.page.margins.left + 12, cy + 10, { width: sectionWidth - 24 });
          doc.fillColor("#6B7280").fontSize(9)
            .text(`훈련일: ${formatDateShort(j.trainingDate)}  ·  유형: ${safeText(j.trainingType)}  ·  트레이너: ${safeText(j.trainerName)}  ·  진행도: ${j.progressRating ? j.progressRating + "/5" : "-"}`,
                  doc.page.margins.left + 12, cy + 28, { width: sectionWidth - 24 });
          doc.fillColor("#374151").fontSize(9)
            .text(truncate(safeText(j.content), 220),
                  doc.page.margins.left + 12, cy + 46, { width: sectionWidth - 24, height: 38, ellipsis: true });
          doc.y = cy + cardHeight + 8;
        });
      }

      // ---- 코멘트 총평 ----
      if (data.comments && data.comments.length > 0) {
        if (doc.y + 80 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.moveDown(0.7);
        doc.fillColor("#111827").fontSize(13).text("코멘트 총평");
        doc.moveDown(0.3);
        const sortedComments = [...data.comments].sort((a, b) => {
          const ad = new Date(a.createdAt || 0).getTime();
          const bd = new Date(b.createdAt || 0).getTime();
          return ad - bd;
        });
        sortedComments.slice(0, 30).forEach((c) => {
          if (doc.y + 30 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          const author = c.authorName || (c.authorRole === "trainer" ? "트레이너" : "보호자");
          doc.fillColor("#0F766E").fontSize(9).text(`${author}  ·  ${formatDateShort(c.createdAt)}`,
            doc.page.margins.left, doc.y, { width: sectionWidth });
          doc.fillColor("#374151").fontSize(10).text(truncate(safeText(c.content), 320),
            doc.page.margins.left, doc.y + 2, { width: sectionWidth });
          doc.moveDown(0.4);
        });
        if (sortedComments.length > 30) {
          doc.fillColor("#9CA3AF").fontSize(8).text(`(외 ${sortedComments.length - 30}건의 코멘트)`, { align: "right" });
        }
      }

      // ---- 숙제 상세 ----
      if (totalHomework > 0) {
        if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.moveDown(0.5);
        doc.fillColor("#111827").fontSize(13).text("숙제 상세");
        doc.moveDown(0.3);
        doc.fontSize(10);
        const homeworkSorted = [...data.homeworkItems].sort((a, b) => {
          const ad = new Date(a.dueDate || a.createdAt || 0).getTime();
          const bd = new Date(b.dueDate || b.createdAt || 0).getTime();
          return ad - bd;
        });
        homeworkSorted.forEach((h) => {
          const status = h.completed ? "✓" : "·";
          const color = h.completed ? "#10B981" : "#9CA3AF";
          const due = h.dueDate ? ` (마감: ${formatDateShort(h.dueDate)})` : "";
          if (doc.y + 18 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          doc.fillColor(color).text(status, doc.page.margins.left, doc.y, { continued: true });
          doc.fillColor("#374151").text(`  ${safeText(h.label)}${due}`);
        });
      }

      // ---- 푸터 ----
      doc.moveDown(2);
      if (doc.y + 30 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc.fontSize(8).fillColor("#9CA3AF")
        .text("본 리포트는 Talez 플랫폼이 자동 생성한 알림장 요약입니다.", { align: "center" });
      doc.text(`© Talez · 발행 ${formatDateShort(new Date())}`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
