#!/usr/bin/env node
/*
 * Headless screenshots of preview.html for verifying hotspot coordinates.
 *
 *   cd v20 && python3 -m http.server 8123          # serve the workspace
 *   npx -y playwright@latest --help >/dev/null     # or: npm i -D playwright
 *   node v20/scripts/shoot-preview.mjs             # writes /tmp/verify-*.png
 *
 * Uses the system Chrome (channel: "chrome"), so no browser download needed.
 */
import { chromium } from "playwright";

const VIEWS = [
	["front", 22, 0],
	["desk", 100, -5],
	["back", 185, -5],
	["listen", -110, -5],
];

const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox", "--use-gl=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:8123/krpano/preview.html", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3500);

for (const [name, yaw, pitch] of VIEWS) {
	await page.evaluate(v => { viewer.setYaw(v[0], false); viewer.setPitch(v[1], false); viewer.setHfov(100, false); }, [yaw, pitch]);
	await page.waitForTimeout(700);
	await page.screenshot({ path: `/tmp/verify-${name}.png` });
	console.log("shot", name);
}

await browser.close();
