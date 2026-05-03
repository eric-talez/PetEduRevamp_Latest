import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const FONT_PATH = path.join(process.cwd(), "server", "assets", "fonts", "NotoSansKR-Regular.ttf");
const FONT_NAME = "NotoSansKR";

let cachedFontBuffer: Buffer | null = null;
function loadFont(): Buffer | null {
  if (cachedFontBuffer) return cachedFontBuffer;
  try {
    if (fs.existsSync(FONT_PATH)) {
      cachedFontBuffer = fs.readFileSync(FONT_PATH);
      return cachedFontBuffer;
    }
  } catch (err) {
    console.warn("[Notebook PDF] 한글 폰트 로드 실패:", err);
  }
  return null;
}

export interface NotebookPdfData {
  journal: any;
  pet?: any;
  trainer?: any;
  owner?: any;
  photoBuffers?: Buffer[]; // 첫 1~2장 사진 임베드용
}

function safeText(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatDate(value: any): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return String(value); }
}

export function generateNotebookPdf(data: NotebookPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: `알림장 #${data.journal?.id ?? ""}`,
          Author: "Talez",
          Subject: "반려동물 훈련 알림장",
          Keywords: "알림장, 훈련, 반려동물",
        },
      });

      const fontBuffer = loadFont();
      if (fontBuffer) {
        doc.registerFont(FONT_NAME, fontBuffer);
        doc.font(FONT_NAME);
      }

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const drawWatermark = () => {
        doc.save();
        doc.fillColor("#000000").opacity(0.05);
        doc.fontSize(56);
        doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text("TALEZ NOTEBOOK", 0, doc.page.height / 2 - 28, { width: doc.page.width, align: "center" });
        doc.restore();
      };
      drawWatermark();
      doc.on("pageAdded", () => {
        if (fontBuffer) doc.font(FONT_NAME);
        drawWatermark();
      });

      doc.opacity(1).fillColor("#111827");

      const journal = data.journal || {};
      const pet = data.pet || {};
      const trainer = data.trainer || {};
      const owner = data.owner || {};

      doc.fontSize(22).text("훈련 알림장", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#6B7280")
        .text(`발행: ${formatDate(new Date())}  ·  Talez`, { align: "center" });
      doc.moveDown(1);

      // 제목 박스
      doc.fillColor("#111827").fontSize(16).text(safeText(journal.title));
      doc.moveDown(0.4);

      // 기본 정보
      doc.fillColor("#111827").fontSize(13).text("기본 정보", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#374151");
      const infoRows: [string, string][] = [
        ["반려동물", `${safeText(pet.name)} (${safeText(pet.breed || pet.species)})`],
        ["보호자", safeText(owner.name || owner.username)],
        ["훈련사", safeText(trainer.name || trainer.username)],
        ["훈련 일시", formatDate(journal.trainingDate)],
        ["훈련 시간", journal.trainingDuration ? `${journal.trainingDuration}분` : "-"],
        ["훈련 유형", safeText(journal.trainingType)],
        ["진행도 평가", journal.progressRating ? `${journal.progressRating} / 5` : "-"],
        ["상태", safeText(journal.status)],
        ["알림장 ID", `#${safeText(journal.id)}`],
      ];
      infoRows.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`);
      });
      doc.moveDown(0.8);

      const drawSection = (title: string, body: string | undefined | null, color = "#F3F4F6") => {
        if (!body) return;
        const text = safeText(body);
        doc.fillColor("#111827").fontSize(13).text(title);
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor("#374151");
        const padding = 8;
        const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const height = doc.heightOfString(text, { width: width - padding * 2 }) + padding * 2;
        if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.save();
        doc.rect(doc.page.margins.left, doc.y, width, height).fill(color);
        doc.restore();
        doc.fillColor("#374151").text(text, doc.page.margins.left + padding, doc.y + padding, {
          width: width - padding * 2,
        });
        doc.y = doc.y + padding;
        doc.moveDown(0.5);
      };

      drawSection("훈련 내용", journal.content, "#F3F4F6");
      drawSection("행동 관찰", journal.behaviorNotes, "#EFF6FF");
      drawSection("집에서 할 숙제", journal.homeworkInstructions, "#FEF3C7");
      drawSection("다음 목표", journal.nextGoals, "#ECFDF5");

      // 사진 첨부 (첫 1~2장)
      const photoBuffers = (data.photoBuffers || []).slice(0, 2);
      if (photoBuffers.length > 0) {
        if (doc.y + 200 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.fillColor("#111827").fontSize(13).text("훈련 사진");
        doc.moveDown(0.3);
        const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - (photoBuffers.length > 1 ? 12 : 0)) / photoBuffers.length;
        const photoHeight = 180;
        const startY = doc.y;
        photoBuffers.forEach((buf, idx) => {
          try {
            const x = doc.page.margins.left + idx * (colWidth + 12);
            doc.image(buf, x, startY, { fit: [colWidth, photoHeight], align: "center", valign: "center" });
          } catch (err) {
            console.warn("[Notebook PDF] 사진 임베드 실패:", err);
          }
        });
        doc.y = startY + photoHeight + 12;
      }

      // 첨부파일 목록
      const attachments: string[] = Array.isArray(journal.attachments) ? journal.attachments.filter(Boolean) : [];
      if (attachments.length > 0) {
        if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.fillColor("#111827").fontSize(13).text("첨부파일");
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor("#2563EB");
        attachments.forEach((url) => {
          const text = `• ${safeText(url)}`;
          const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 12;
          const h = doc.heightOfString(text, { width });
          if (doc.y + h + 6 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          doc.text(text, doc.page.margins.left + 4, doc.y, { width });
          doc.moveDown(0.15);
        });
        doc.moveDown(0.5);
      }

      doc.moveDown(1);
      if (doc.y + 40 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc.fontSize(8).fillColor("#9CA3AF").text(
        "본 알림장은 Talez 플랫폼이 발행한 훈련 기록입니다. 외부 공유 시 개인정보 노출에 유의하세요.",
        { align: "center" }
      );
      doc.text(`© Talez · 발행 ${formatDate(new Date())}`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
