import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sdkSource = path.join(root, "node_modules", "face-age", "dist");
const sdkTarget = path.join(root, "public", "vendor", "face-age");
const collectorSource = path.join(root, "collector", "face-age-insights.js");
const collectorTarget = path.join(root, "public", "collector", "face-age-insights.js");

if (!fs.existsSync(sdkSource)) {
  console.error("face-age is not installed. Run: npm install face-age@latest");
  process.exit(1);
}

fs.rmSync(sdkTarget, { recursive: true, force: true });
fs.mkdirSync(sdkTarget, { recursive: true });
for (const file of fs.readdirSync(sdkSource)) {
  fs.copyFileSync(path.join(sdkSource, file), path.join(sdkTarget, file));
}

fs.mkdirSync(path.dirname(collectorTarget), { recursive: true });
fs.copyFileSync(collectorSource, collectorTarget);
console.log("Copied face-age dist and the insights collector into public/.");
