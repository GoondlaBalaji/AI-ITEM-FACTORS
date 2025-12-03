import { NextRequest } from "next/server";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

export async function POST(req: NextRequest) {
  const { html } = await req.json();

  const executablePath =
    (await chromium.executablePath) ||
    process.env.CHROME_PATH; // fallback for Windows dev

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "12mm", right: "12mm" },
  });

  await browser.close();

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="AI_Item_Factors_Report.pdf"`,
    },
  });
}
