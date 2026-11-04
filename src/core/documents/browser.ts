import puppeteer, { Browser } from "puppeteer-core";
import fs from "fs";

export function getBrowserExecutablePath(): string {
  // 1. Custom explicit environment variable override (Railway, Docker, Cloud VPS, CI)
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN && fs.existsSync(/*turbopackIgnore: true*/ process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  // 2. Cross-platform paths for Linux / Docker / Windows / macOS
  const possiblePaths = [
    // Linux / Docker / Cloud containers (Debian, Ubuntu, Alpine)
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",

    // Windows paths
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",

    // macOS paths
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
      return p;
    }
  }
  throw new Error("Neither Google Chrome nor Microsoft Edge / Chromium was found. In production, set PUPPETEER_EXECUTABLE_PATH or install chromium.");
}

export function isChromiumAvailable(): boolean {
  try {
    getBrowserExecutablePath();
    return true;
  } catch {
    return false;
  }
}

export function getChromiumPath(): string | null {
  try {
    return getBrowserExecutablePath();
  } catch {
    return null;
  }
}

export async function launchBrowser(): Promise<Browser> {
  const exePath = getBrowserExecutablePath();
  return await puppeteer.launch({
    executablePath: exePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
}
