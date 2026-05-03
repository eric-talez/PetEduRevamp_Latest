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
    console.warn("[Certificate PDF] 한글 폰트 로드 실패:", err);
  }
  return null;
}

export interface CertificatePdfData {
  certificateNo: string;
  userName: string;
  petName?: string | null;
  courseTitle: string;
  trainerName: string;
  instituteName: string;
  completedAt: string | null;
  totalSessions: number;
  completedSessions: number;
}

function formatKoreanDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(value);
  }
}

export function generateCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 40,
        info: {
          Title: `수료증 ${data.certificateNo}`,
          Author: data.instituteName,
          Subject: `${data.courseTitle} 수료증`,
          Keywords: "수료증, certificate, talez",
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

      const pageW = doc.page.width;
      const pageH = doc.page.height;

      // 외곽 더블 보더 (앰버 톤)
      const borderColor = "#B45309";
      doc.save();
      doc.lineWidth(6).strokeColor(borderColor)
        .rect(24, 24, pageW - 48, pageH - 48).stroke();
      doc.lineWidth(1).strokeColor(borderColor)
        .rect(36, 36, pageW - 72, pageH - 72).stroke();
      doc.restore();

      // 워터마크
      doc.save();
      doc.fillColor("#B45309").opacity(0.05);
      doc.fontSize(96);
      doc.rotate(-25, { origin: [pageW / 2, pageH / 2] });
      doc.text("CERTIFIED", 0, pageH / 2 - 50, { width: pageW, align: "center" });
      doc.restore();
      doc.opacity(1);

      // 상단 타이틀
      const titleTop = 80;
      doc.fillColor("#78350F").fontSize(44)
        .text("수 료 증", 0, titleTop, { width: pageW, align: "center" });

      doc.fillColor("#92400E").fontSize(12)
        .text("Certificate of Completion", 0, titleTop + 60, { width: pageW, align: "center" });

      doc.fillColor("#6B7280").fontSize(10)
        .text(`No. ${data.certificateNo}`, 0, titleTop + 80, { width: pageW, align: "center" });

      // 수강생 성명
      const nameTop = titleTop + 130;
      doc.fillColor("#374151").fontSize(13)
        .text("성명", 0, nameTop, { width: pageW, align: "center" });
      doc.fillColor("#111827").fontSize(28)
        .text(data.userName, 0, nameTop + 22, { width: pageW, align: "center" });

      if (data.petName) {
        doc.fillColor("#6B7280").fontSize(12)
          .text(`반려동물: ${data.petName}`, 0, nameTop + 62, { width: pageW, align: "center" });
      }

      // 본문
      const bodyTop = nameTop + (data.petName ? 100 : 80);
      const bodyText =
        `위 수강생은 “${data.courseTitle}” 과정의 전 ${data.totalSessions}회차를 ` +
        `모두 성실히 이수하여 본 수료증을 수여합니다.`;
      doc.fillColor("#1F2937").fontSize(13)
        .text(bodyText, 80, bodyTop, { width: pageW - 160, align: "center", lineGap: 4 });

      // 수료일
      const dateTop = bodyTop + 70;
      doc.fillColor("#374151").fontSize(12)
        .text(`수료일 : ${formatKoreanDate(data.completedAt)}`, 0, dateTop, {
          width: pageW, align: "center",
        });

      // 서명란
      const sigTop = pageH - 130;
      const colW = (pageW - 160) / 2;
      doc.fillColor("#6B7280").fontSize(10);
      doc.text("담당 트레이너", 80, sigTop, { width: colW, align: "center" });
      doc.text("발급 기관", 80 + colW, sigTop, { width: colW, align: "center" });

      doc.fillColor("#111827").fontSize(15);
      doc.text(data.trainerName, 80, sigTop + 18, { width: colW, align: "center" });
      doc.text(data.instituteName, 80 + colW, sigTop + 18, { width: colW, align: "center" });

      doc.save().strokeColor("#9CA3AF").lineWidth(0.5);
      doc.moveTo(80 + 40, sigTop + 50).lineTo(80 + colW - 40, sigTop + 50).stroke();
      doc.moveTo(80 + colW + 40, sigTop + 50).lineTo(80 + colW * 2 - 40, sigTop + 50).stroke();
      doc.restore();

      // 푸터
      doc.fillColor("#9CA3AF").fontSize(8)
        .text(
          `본 수료증은 ${data.instituteName}이(가) 발행한 공식 수료증입니다. 인증번호로 검증할 수 있습니다.`,
          0, pageH - 55, { width: pageW, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
