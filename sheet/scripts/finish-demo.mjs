// Turn the newest Playwright demo video (test-results/**/video.webm) into demo/orf-demo.mp4 and .gif.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".webm") ? [join(dir, e.name)] : []));
const videos = walk("test-results").map((f) => ({ f, t: statSync(f).mtimeMs })).sort((a, b) => b.t - a.t);
if (videos.length === 0) { console.error("finish-demo: no video.webm under test-results/; run `npx playwright test --project demo` first"); process.exit(1); }
const src = videos[0].f;
mkdirSync("demo", { recursive: true });
copyFileSync(src, "demo/orf-demo.webm");
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
ff(["-i", src, "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "demo/orf-demo.mp4"]);
ff(["-i", src, "-vf", "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", "demo/orf-demo.gif"]);
for (const out of ["demo/orf-demo.webm", "demo/orf-demo.mp4", "demo/orf-demo.gif"]) console.log(`${out}  ${(statSync(out).size / 1e6).toFixed(1)} MB`);
