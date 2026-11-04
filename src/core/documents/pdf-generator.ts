import { launchBrowser } from "./browser";

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Set viewport for high DPI crisp rendering
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });

    // Ensure web fonts are completely loaded before generating PDF
    await page.evaluateHandle("document.fonts.ready");

    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "12mm",
        right: "12mm",
      },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
