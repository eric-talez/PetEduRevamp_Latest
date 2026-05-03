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
    console.warn("[정산 PDF] 한글 폰트 로드 실패:", err);
  }
  return null;
}

const STATUS_KO: Record<string, string> = {
  pending: "예정",
  confirmed: "확정",
  locked: "마감",
  paid: "지급완료",
  canceled: "취소",
};

export interface SettlementPdfItem {
  occurredAt: Date | string | null;
  sourceType: string;
  sourceId: number;
  sourceName: string | null;
  category: string | null;
  grossAmount: string | number;
  commissionRate: string | number;
  platformFee: string | number;
  netAmount: string | number;
  status: string;
}

export interface SettlementPdfTrainerGroup {
  trainerId: number;
  trainerName: string;
  trainerEmail: string;
  items: SettlementPdfItem[];
}

export interface SettlementPdfData {
  month: string;
  groups: SettlementPdfTrainerGroup[];
}

const fmtDate = (v: Date | string | null) => {
  if (!v) return "-";
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("ko-KR");
  } catch {
    return String(v);
  }
};
const fmtWon = (v: string | number) => `${Number(v || 0).toLocaleString()}원`;

export function generateTrainerSettlementPdf(data: SettlementPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        layout: "landscape",
        info: {
          Title: `${data.month} 트레이너 정산 명세서`,
          Author: "Talez",
          Subject: "트레이너 정산 명세서",
        },
      });

      const fontBuffer = loadFont();
      if (fontBuffer) {
        doc.registerFont(FONT_NAME, fontBuffer);
        doc.font(FONT_NAME);
      }

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.on("pageAdded", () => {
        if (fontBuffer) doc.font(FONT_NAME);
      });

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      doc.fillColor("#111827").fontSize(20).text(`${data.month} 트레이너 정산 명세서`, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#6B7280").text(
        `발행일: ${new Date().toLocaleString("ko-KR")} · 트레이너 ${data.groups.length}명 · 항목 ${data.groups.reduce(
          (s, g) => s + g.items.length,
          0
        )}건`,
        { align: "center" }
      );
      doc.moveDown(1);

      // 전체 합계
      let totalGross = 0,
        totalFee = 0,
        totalNet = 0;
      data.groups.forEach((g) =>
        g.items.forEach((i) => {
          if (i.status === "canceled") return;
          totalGross += Number(i.grossAmount);
          totalFee += Number(i.platformFee);
          totalNet += Number(i.netAmount);
        })
      );

      const summaryY = doc.y;
      const boxW = (pageWidth - 16) / 3;
      const summaries: [string, string, string][] = [
        ["총 매출", fmtWon(totalGross), "#3B82F6"],
        ["플랫폼 수수료", fmtWon(totalFee), "#DC2626"],
        ["정산액 합계", fmtWon(totalNet), "#10B981"],
      ];
      summaries.forEach(([label, value, color], idx) => {
        const x = doc.page.margins.left + idx * (boxW + 8);
        doc.save();
        doc.roundedRect(x, summaryY, boxW, 56, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
        doc.restore();
        doc.fillColor("#6B7280").fontSize(9).text(label, x + 12, summaryY + 10, { width: boxW - 24 });
        doc.fillColor(color).fontSize(18).text(value, x + 12, summaryY + 26, { width: boxW - 24 });
      });
      doc.y = summaryY + 56 + 16;

      if (data.groups.length === 0) {
        doc.fillColor("#6B7280").fontSize(11).text("해당 월에 정산 항목이 없습니다.", { align: "center" });
        doc.end();
        return;
      }

      // 컬럼 정의
      const cols = [
        { key: "date", label: "발생일", width: 70, align: "left" as const },
        { key: "type", label: "유형", width: 55, align: "left" as const },
        { key: "name", label: "상품/강의", width: 180, align: "left" as const },
        { key: "category", label: "카테고리", width: 80, align: "left" as const },
        { key: "gross", label: "총금액", width: 90, align: "right" as const },
        { key: "rate", label: "수수료율", width: 60, align: "right" as const },
        { key: "fee", label: "플랫폼 수수료", width: 100, align: "right" as const },
        { key: "net", label: "정산액", width: 100, align: "right" as const },
        { key: "status", label: "상태", width: 50, align: "left" as const },
      ];
      const totalColW = cols.reduce((s, c) => s + c.width, 0);
      // 컬럼 너비를 페이지에 맞게 스케일
      const scale = pageWidth / totalColW;
      cols.forEach((c) => (c.width = c.width * scale));

      const drawRow = (
        cells: string[],
        opts: { header?: boolean; footer?: boolean } = {}
      ) => {
        const rowH = 20;
        if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
        const startY = doc.y;
        let x = doc.page.margins.left;
        if (opts.header) {
          doc.save();
          doc.rect(x, startY, pageWidth, rowH).fill("#F3F4F6");
          doc.restore();
        } else if (opts.footer) {
          doc.save();
          doc.rect(x, startY, pageWidth, rowH).fill("#FAFAFA");
          doc.restore();
        }
        doc.fontSize(9).fillColor("#111827");
        cols.forEach((c, idx) => {
          doc.save();
          doc.strokeColor("#E5E7EB").lineWidth(0.5).rect(x, startY, c.width, rowH).stroke();
          doc.restore();
          doc.text(cells[idx] ?? "", x + 4, startY + 5, {
            width: c.width - 8,
            align: c.align,
            ellipsis: true,
            lineBreak: false,
          });
          x += c.width;
        });
        doc.y = startY + rowH;
      };

      data.groups.forEach((g, gi) => {
        if (gi > 0) doc.moveDown(0.6);

        // 트레이너 헤더
        if (doc.y + 36 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.fillColor("#111827").fontSize(13).text(
          `${g.trainerName}  `,
          doc.page.margins.left,
          doc.y,
          { continued: true }
        );
        doc.fillColor("#6B7280").fontSize(9).text(`#${g.trainerId} · ${g.trainerEmail || "-"}`);
        doc.moveDown(0.3);
        // 구분선
        doc.save();
        doc
          .strokeColor("#111827")
          .lineWidth(1)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .stroke();
        doc.restore();
        doc.moveDown(0.3);

        drawRow(
          cols.map((c) => c.label),
          { header: true }
        );

        let gGross = 0,
          gFee = 0,
          gNet = 0;
        g.items.forEach((it) => {
          if (it.status !== "canceled") {
            gGross += Number(it.grossAmount);
            gFee += Number(it.platformFee);
            gNet += Number(it.netAmount);
          }
          drawRow([
            fmtDate(it.occurredAt),
            it.sourceType,
            it.sourceName || `#${it.sourceId}`,
            it.category || "-",
            fmtWon(it.grossAmount),
            `${Number(it.commissionRate)}%`,
            fmtWon(it.platformFee),
            fmtWon(it.netAmount),
            STATUS_KO[it.status] || it.status,
          ]);
        });

        drawRow(
          [
            "합계 (취소 제외)",
            "",
            "",
            "",
            fmtWon(gGross),
            "",
            fmtWon(gFee),
            fmtWon(gNet),
            "",
          ],
          { footer: true }
        );
      });

      doc.moveDown(1);
      if (doc.y + 30 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(`© Talez · 발행 ${new Date().toLocaleString("ko-KR")}`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
