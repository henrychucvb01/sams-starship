import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const required = ["starship-panic-logo", "approved-ship", "space-muncher-chibi"];
const problems = [];
let bytes = 0;
for (const name of required) {
  const options = ["webp", "png"].map(ext => fileURLToPath(new URL(`../src/assets/title/${name}.${ext}`, import.meta.url)));
  const path = options.find(existsSync);
  if (!path) { problems.push(`Missing approved export: ${name}.png (or .webp)`); continue; }
  const data = readFileSync(path);
  bytes += data.length;
  const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  if (!png && !webp) problems.push(`Invalid PNG/WebP: ${name}`);
  if (webp && !(data.toString("ascii", 12, 16) === "VP8X" && (data[20] & 16)) && !data.includes(Buffer.from("ALPH"))) problems.push(`WebP has no alpha channel: ${name}`);
  // Encoding checks are preliminary; real alpha edges and identity still need visual QA.
  if (png && ![4, 6].includes(data[25]) && !data.includes(Buffer.from("tRNS"))) problems.push(`PNG has no transparency channel: ${name}`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  console.error("Release blocked. See src/assets/title/README.md for exact Canva exports. Never substitute reference art.");
  process.exit(1);
}
console.log(`Approved asset files present (${Math.round(bytes / 1024)} KB). Verify artwork identity, transparency, aspect ratios and all animation phases visually before release.`);
if (bytes > 700 * 1024) console.warn("Optimize the exports: suggested total budget is 700 KB.");
