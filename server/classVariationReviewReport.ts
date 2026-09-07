import PDFDocument from "pdfkit";

type Brand = { schoolName: string; accentColor: string; footerLine: string };
type Variation = { expectedWord: string; recognisedVariant: string; updatedAt: Date };
type Review = { childName: string; storyTitle: string; expectedWord: string; recognisedWord: string; source: string; status: string; createdAt: Date; confirmedAt: Date | null };

function safeAccent(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2563EB";
}

function dateLabel(value: Date | null) {
  return value ? value.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export async function createClassVariationReviewPdf(input: { className: string; branding: Brand; variants: Variation[]; reviews: Review[] }) {
  const document = new PDFDocument({ margin: 46, size: "A4", info: { Title: `${input.className} Class Variation Review` } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  const accent = safeAccent(input.branding.accentColor);

  document.rect(0, 0, document.page.width, 82).fill(accent);
  document.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(input.branding.schoolName, 46, 25);
  document.font("Helvetica").fontSize(9).text("READER LEADER · TEACHER REVIEW", 46, 50);
  document.fillColor("#172554").font("Helvetica-Bold").fontSize(24).text("Class variation review", 46, 112);
  document.font("Helvetica").fontSize(11).fillColor("#475569").text(`${input.className} · Prepared ${dateLabel(new Date())}`, 46, 145);
  document.moveTo(46, 169).lineTo(549, 169).strokeColor(accent).lineWidth(2).stroke();

  document.fillColor("#172554").font("Helvetica-Bold").fontSize(14).text("Approved Irish English variations", 46, 190);
  document.font("Helvetica").fontSize(10).fillColor("#334155");
  if (input.variants.length) {
    input.variants.slice(0, 12).forEach((item, index) => document.text(`${index + 1}. Expected “${item.expectedWord}” → recognised “${item.recognisedVariant}” · reviewed ${dateLabel(item.updatedAt)}`, 55, 215 + index * 19));
  } else {
    document.text("No class-specific variants have been approved yet.", 55, 215);
  }

  const reviewY = 215 + Math.min(input.variants.length, 12) * 19 + 32;
  document.fillColor("#172554").font("Helvetica-Bold").fontSize(14).text("Provisional-match review history", 46, Math.min(reviewY, 496));
  document.font("Helvetica").fontSize(9.5).fillColor("#334155");
  const rows = input.reviews.slice(0, 10);
  const startY = Math.min(reviewY + 25, 521);
  if (rows.length) {
    rows.forEach((item, index) => {
      const status = item.status === "confirmed" ? `Confirmed ${dateLabel(item.confirmedAt)}` : "Pending teacher review";
      document.text(`${item.childName} · ${item.storyTitle}\nExpected “${item.expectedWord}” → recognised “${item.recognisedWord}” · ${status}`, 55, startY + index * 37, { width: 484, lineGap: 2 });
    });
  } else {
    document.text("No provisional Irish English matches have been recorded for this class yet.", 55, startY);
  }

  document.font("Helvetica-Oblique").fontSize(8).fillColor("#64748B").text(`${input.branding.footerLine}\nThis teacher review record supports conversation and professional judgement. It does not diagnose accent, language, or reading ability.`, 46, 760, { width: 503, align: "center" });
  document.end();
  return complete;
}
