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
    console.warn("[PDF] 한글 폰트 로드 실패:", err);
  }
  return null;
}

export interface AnalysisPdfData {
  analysis: any;
  pet?: any;
  owner?: any;
  watermark?: string;
  careLogsByDate?: Record<string, any[]>;
  careDates?: string[];
}

interface MetricScore {
  label: string;
  score: number;
  description?: string;
  color: string;
}

function clampScore(value: any): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  if (n >= 0 && n <= 10) return Math.round(n * 10);
  if (n >= 0 && n <= 100) return Math.round(n);
  return null;
}

function deriveMetricScores(result: any, careLogsByDate: Record<string, any[]>): MetricScore[] {
  const r = result || {};
  const metrics: MetricScore[] = [];

  const emotionScore =
    clampScore(r.emotionScore) ??
    clampScore(r.emotion?.score) ??
    clampScore(r.scores?.emotion) ??
    clampScore(r.sentiment) ??
    null;
  const stressScore =
    clampScore(r.stressScore) ??
    clampScore(r.stress?.score) ??
    clampScore(r.scores?.stress) ??
    null;
  const healthScore =
    clampScore(r.healthScore) ??
    clampScore(r.health?.score) ??
    clampScore(r.scores?.health) ??
    null;

  const allLogs = Object.values(careLogsByDate).flat();
  const totalDays = Math.max(Object.keys(careLogsByDate).length, 1);
  const mealCount = allLogs.filter((l: any) => l?.type === 'meal' || l?.category === 'meal').length;
  const poopCount = allLogs.filter((l: any) => l?.type === 'poop' || l?.category === 'poop').length;
  const walkCount = allLogs.filter((l: any) => l?.type === 'walk' || l?.category === 'walk').length;

  const fallbackEmotion = Math.min(100, Math.round((mealCount / totalDays) * 30 + (walkCount / totalDays) * 25 + 30));
  const fallbackStress = Math.max(0, 100 - Math.min(100, Math.round((walkCount / totalDays) * 40 + (mealCount / totalDays) * 20)));
  const fallbackHealth = Math.min(100, Math.round((mealCount / totalDays) * 25 + (poopCount / totalDays) * 30 + 30));

  const emotion = emotionScore ?? fallbackEmotion;
  const stress = stressScore ?? fallbackStress;
  const health = healthScore ?? fallbackHealth;

  metrics.push({
    label: '감정 안정도',
    score: emotion,
    description: emotion >= 70 ? '안정적' : emotion >= 40 ? '보통' : '주의 필요',
    color: '#3B82F6',
  });
  metrics.push({
    label: '스트레스 지수',
    score: stress,
    description: stress >= 70 ? '높음 - 관리 필요' : stress >= 40 ? '보통' : '낮음',
    color: stress >= 70 ? '#DC2626' : stress >= 40 ? '#F59E0B' : '#10B981',
  });
  metrics.push({
    label: '건강 점수',
    score: health,
    description: health >= 70 ? '양호' : health >= 40 ? '보통' : '주의 필요',
    color: health >= 70 ? '#10B981' : health >= 40 ? '#F59E0B' : '#DC2626',
  });

  return metrics;
}

function safeText(value: any): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDate(value: any): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function modelLabel(model: string | undefined): string {
  if (!model) return "AI 모델";
  if (model.startsWith("claude")) return `Claude (${model})`;
  if (model.startsWith("gemini")) return `Gemini (${model})`;
  return `ChatGPT (${model})`;
}

export function generateAnalysisPdf(data: AnalysisPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: `AI 분석 리포트 #${data.analysis?.id ?? ""}`,
          Author: "Talez",
          Subject: "반려동물 AI 분석 리포트",
          Keywords: "AI, 분석, 반려동물, 리포트",
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

      const watermarkText = data.watermark || "TALEZ AI REPORT";

      const drawWatermark = () => {
        doc.save();
        doc.fillColor("#000000").opacity(0.06);
        doc.fontSize(60);
        doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text(watermarkText, 0, doc.page.height / 2 - 30, {
          width: doc.page.width,
          align: "center",
        });
        doc.restore();
      };

      drawWatermark();
      doc.on("pageAdded", () => {
        if (fontBuffer) doc.font(FONT_NAME);
        drawWatermark();
      });

      doc.opacity(1).fillColor("#111827");

      doc.fontSize(22).text("반려동물 AI 분석 리포트", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#6B7280")
        .text(`발행: ${formatDate(new Date())}  ·  Talez`, { align: "center" });
      doc.moveDown(1);

      doc.fillColor("#111827").fontSize(13).text("기본 정보", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor("#374151");
      const pet = data.pet || {};
      const owner = data.owner || {};
      const analysis = data.analysis || {};
      const infoRows: [string, string][] = [
        ["반려동물", `${safeText(pet.name)} (${safeText(pet.breed)} / ${safeText(pet.species)})`],
        ["나이/성별", `${safeText(pet.age)}세 / ${safeText(pet.gender)}`],
        ["보호자", safeText(owner.name || owner.username)],
        ["분석 일시", formatDate(analysis.createdAt)],
        ["분석 기간", safeText(analysis.timeRange)],
        ["사용 모델", modelLabel(analysis.model)],
        ["리포트 ID", `#${safeText(analysis.id)}`],
      ];
      infoRows.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`);
      });
      doc.moveDown(0.8);

      const result = analysis.resultJson || {};
      const careLogsByDate = data.careLogsByDate || {};
      const careDates = (data.careDates && data.careDates.length > 0)
        ? data.careDates
        : Object.keys(careLogsByDate).sort();

      // 핵심 지표 (감정 / 스트레스 / 건강)
      const metrics = deriveMetricScores(result, careLogsByDate);
      doc.fillColor("#111827").fontSize(13).text("핵심 지표");
      doc.moveDown(0.4);
      const metricBoxWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 16) / 3;
      const metricBoxHeight = 70;
      const metricBoxY = doc.y;
      metrics.forEach((metric, idx) => {
        const x = doc.page.margins.left + idx * (metricBoxWidth + 8);
        doc.save();
        doc.roundedRect(x, metricBoxY, metricBoxWidth, metricBoxHeight, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
        doc.restore();
        doc.fillColor("#6B7280").fontSize(9).text(metric.label, x + 10, metricBoxY + 8, { width: metricBoxWidth - 20 });
        doc.fillColor(metric.color).fontSize(22).text(`${metric.score}`, x + 10, metricBoxY + 22, { width: metricBoxWidth - 20, continued: true });
        doc.fillColor("#9CA3AF").fontSize(10).text(" / 100");
        if (metric.description) {
          doc.fillColor(metric.color).fontSize(9).text(metric.description, x + 10, metricBoxY + 52, { width: metricBoxWidth - 20 });
        }
      });
      doc.y = metricBoxY + metricBoxHeight + 12;

      // 일별 케어 활동 차트 (식사/배변/산책) — 막대 + 추이 라인 + 요약 표
      if (careDates.length > 0) {
        const series: { key: string; label: string; color: string }[] = [
          { key: "meal", label: "식사", color: "#3B82F6" },
          { key: "poop", label: "배변", color: "#F59E0B" },
          { key: "walk", label: "산책", color: "#10B981" },
        ];

        const counts: Record<string, Record<string, number>> = {};
        let maxCount = 1;
        careDates.forEach((d) => {
          const logs = careLogsByDate[d] || [];
          counts[d] = { meal: 0, poop: 0, walk: 0 };
          logs.forEach((log: any) => {
            const t = log?.type || log?.category;
            if (t === "meal") counts[d].meal++;
            else if (t === "poop") counts[d].poop++;
            else if (t === "walk") counts[d].walk++;
          });
          series.forEach((s) => { if (counts[d][s.key] > maxCount) maxCount = counts[d][s.key]; });
        });

        const drawChart = (title: string, mode: "bar" | "line", height: number) => {
          const chartLeft = doc.page.margins.left;
          const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          if (doc.y + height + 50 > doc.page.height - doc.page.margins.bottom) doc.addPage();

          doc.fillColor("#111827").fontSize(13).text(title);
          doc.moveDown(0.3);
          const chartTop = doc.y;

          doc.save();
          doc.rect(chartLeft, chartTop, chartWidth, height).stroke("#E5E7EB");
          doc.restore();

          const innerLeft = chartLeft + 30;
          const innerTop = chartTop + 8;
          const innerHeight = height - 28;
          const innerWidth = chartWidth - 40;

          for (let g = 0; g <= 4; g++) {
            const y = innerTop + (innerHeight * g) / 4;
            const value = Math.round(maxCount - (maxCount * g) / 4);
            doc.save();
            doc.strokeColor("#F3F4F6").lineWidth(0.5).moveTo(innerLeft, y).lineTo(innerLeft + innerWidth, y).stroke();
            doc.restore();
            doc.fillColor("#9CA3AF").fontSize(7).text(String(value), chartLeft + 4, y - 3, { width: 22, align: "right" });
          }

          if (mode === "bar") {
            const groupWidth = innerWidth / careDates.length;
            const barWidth = Math.max(3, (groupWidth - 6) / series.length);
            careDates.forEach((d, di) => {
              const groupX = innerLeft + di * groupWidth + 3;
              series.forEach((s, si) => {
                const v = counts[d][s.key];
                const h = (v / maxCount) * innerHeight;
                const x = groupX + si * barWidth;
                const y = innerTop + innerHeight - h;
                doc.save();
                doc.rect(x, y, barWidth - 1, h).fill(s.color);
                doc.restore();
              });
              const labelText = d.slice(5);
              doc.fontSize(7).fillColor("#6B7280").text(labelText, groupX - 5, innerTop + innerHeight + 4, { width: groupWidth, align: "center" });
            });
          } else {
            const stepX = careDates.length > 1 ? innerWidth / (careDates.length - 1) : 0;
            const pointFor = (d: string, key: string, di: number) => {
              const v = counts[d][key];
              const x = careDates.length > 1 ? innerLeft + di * stepX : innerLeft + innerWidth / 2;
              const y = innerTop + innerHeight - (v / maxCount) * innerHeight;
              return { x, y };
            };
            series.forEach((s) => {
              doc.save();
              doc.strokeColor(s.color).lineWidth(1.5);
              careDates.forEach((d, di) => {
                const p = pointFor(d, s.key, di);
                if (di === 0) doc.moveTo(p.x, p.y);
                else doc.lineTo(p.x, p.y);
              });
              doc.stroke();
              doc.restore();
              careDates.forEach((d, di) => {
                const p = pointFor(d, s.key, di);
                doc.save();
                doc.circle(p.x, p.y, 2).fill(s.color);
                doc.restore();
              });
            });
            careDates.forEach((d, di) => {
              const x = careDates.length > 1 ? innerLeft + di * stepX : innerLeft + innerWidth / 2;
              const labelText = d.slice(5);
              doc.fontSize(7).fillColor("#6B7280").text(labelText, x - 18, innerTop + innerHeight + 4, { width: 36, align: "center" });
            });
          }

          let legendX = chartLeft;
          const legendY = chartTop + height + 6;
          doc.fontSize(8);
          series.forEach((s) => {
            doc.save();
            doc.rect(legendX, legendY, 8, 8).fill(s.color);
            doc.restore();
            doc.fillColor("#374151").text(s.label, legendX + 12, legendY, { continued: false });
            legendX += 60;
          });
          doc.y = legendY + 16;
          doc.moveDown(0.4);
        };

        drawChart("일별 케어 활동 (막대)", "bar", 130);
        drawChart("기간별 활동 추이 (라인)", "line", 130);

        // 핵심 지표 요약 테이블 (총 횟수/일평균/최대/활동일)
        if (doc.y + 110 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.fillColor("#111827").fontSize(13).text("핵심 지표 요약");
        doc.moveDown(0.3);
        const tableLeft = doc.page.margins.left;
        const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const cols = [
          { label: "항목", w: 0.28 },
          { label: "총 횟수", w: 0.18 },
          { label: "일평균", w: 0.18 },
          { label: "최대/일", w: 0.18 },
          { label: "활동일", w: 0.18 },
        ];
        const colX: number[] = [];
        let cx = tableLeft;
        cols.forEach((c) => { colX.push(cx); cx += tableWidth * c.w; });
        const rowH = 22;
        let ty = doc.y;

        doc.save();
        doc.rect(tableLeft, ty, tableWidth, rowH).fill("#F3F4F6");
        doc.restore();
        doc.fillColor("#111827").fontSize(10);
        cols.forEach((c, i) => {
          doc.text(c.label, colX[i] + 6, ty + 6, { width: tableWidth * c.w - 12 });
        });
        ty += rowH;

        const totalDays = careDates.length || 1;
        series.forEach((s) => {
          const values = careDates.map((d) => counts[d][s.key] || 0);
          const total = values.reduce((a, b) => a + b, 0);
          const avg = total / totalDays;
          const max = values.reduce((a, b) => Math.max(a, b), 0);
          const activeDays = values.filter((v) => v > 0).length;

          doc.save();
          doc.rect(tableLeft, ty, tableWidth, rowH).stroke("#E5E7EB");
          doc.restore();

          doc.save();
          doc.rect(colX[0] + 6, ty + 7, 8, 8).fill(s.color);
          doc.restore();
          doc.fillColor("#111827").fontSize(10).text(s.label, colX[0] + 20, ty + 6, { width: tableWidth * cols[0].w - 26 });
          doc.fillColor("#374151").text(`${total}회`, colX[1] + 6, ty + 6, { width: tableWidth * cols[1].w - 12 });
          doc.text(`${avg.toFixed(1)}회`, colX[2] + 6, ty + 6, { width: tableWidth * cols[2].w - 12 });
          doc.text(`${max}회`, colX[3] + 6, ty + 6, { width: tableWidth * cols[3].w - 12 });
          doc.text(`${activeDays}/${totalDays}일`, colX[4] + 6, ty + 6, { width: tableWidth * cols[4].w - 12 });
          ty += rowH;
        });
        doc.y = ty + 8;
        doc.moveDown(0.4);
      }


      const drawSection = (title: string, body: string | undefined, color = "#F3F4F6") => {
        if (!body) return;
        doc.fillColor("#111827").fontSize(13).text(title);
        doc.moveDown(0.2);
        const startY = doc.y;
        const text = safeText(body);
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

      drawSection("종합 분석", result.summary, "#F3F4F6");
      drawSection("행동 패턴", result.behavior, "#EFF6FF");
      drawSection("건강 상태", result.health, "#ECFDF5");
      drawSection("영양 상태", result.nutrition, "#FEF3C7");
      drawSection("활동 분석", result.activity, "#F5F3FF");

      const drawList = (title: string, items: any[] | undefined, accent = "#F59E0B") => {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (list.length === 0) return;
        if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.fillColor("#111827").fontSize(13).text(title);
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#374151");
        list.forEach((item) => {
          const text = `• ${safeText(item)}`;
          const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 12;
          const h = doc.heightOfString(text, { width });
          if (doc.y + h + 6 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          const startY = doc.y;
          doc.save();
          doc.rect(doc.page.margins.left, startY - 1, 3, h + 4).fill(accent);
          doc.restore();
          doc.fillColor("#374151").text(text, doc.page.margins.left + 10, startY, { width });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.5);
      };

      drawList("⚠️ 주의사항 (Red Flags)", result.redFlags, "#F59E0B");
      drawList("✅ 권장사항", result.nextSteps, "#3B82F6");

      doc.moveDown(1);
      if (doc.y + 40 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc.fontSize(8).fillColor("#9CA3AF").text(
        "본 리포트는 Talez AI 분석 시스템이 생성한 자료입니다. 정확한 진단·처방은 반드시 전문 수의사와 상담하세요.",
        { align: "center" }
      );
      doc.text(`© Talez · 발행 ${formatDate(new Date())}`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
