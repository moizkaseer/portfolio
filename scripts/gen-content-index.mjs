// Writes lib/content/slugs.generated.json: the run slugs that exist (content/projects/*).
// proxy.ts uses it so unknown /work/<slug> addresses answer a real 404 on the first request.
// Runs before `next dev` and `next build`; tests/unit/content.test.ts checks it is in sync.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "content", "projects");
const slugs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
fs.writeFileSync(path.join(process.cwd(), "lib", "content", "slugs.generated.json"), JSON.stringify(slugs, null, 2) + "\n");
console.log(`content index: ${slugs.length} runs`);
