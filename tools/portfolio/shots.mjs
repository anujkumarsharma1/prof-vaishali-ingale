// Full-page screenshots of every site page at desktop and phone widths.
// Usage: node tools/portfolio/shots.mjs <outDir> [baseUrl] [page ...]
// Scrolls each page top to bottom first so scroll-triggered reveals have played.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [outDir = "shots", base = "http://127.0.0.1:4000/prof-vaishali-ingale", ...only] = process.argv.slice(2);
const pages = only.length ? only : ["about/", "publications/", "leadership/", "awards/", "cv/", "news/", "wishes/", "404.html"];
const viewports = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
fs.mkdirSync(outDir, { recursive: true });

const exe = process.env.PW_CHROMIUM || (fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const errors = [];
for (const [vpName, vp] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  for (const p of pages) {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${vpName} ${p}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${vpName} ${p}: console ${m.text()}`));
    await page.goto(`${base}/${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += Math.round(vp.height * 0.6)) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const file = path.join(outDir, `${vpName}-${p.replace(/\/$/, "").replace(/[\/.]/g, "_") || "root"}.png`);
    await page.screenshot({ path: file, fullPage: true });
    // Above-the-fold shot too (the fold is what people judge)
    await page.screenshot({ path: file.replace(".png", "-fold.png") });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(outDir, "errors.txt"), errors.join("\n") + "\n");
console.log(`shots in ${outDir}; ${errors.length} page errors`);
