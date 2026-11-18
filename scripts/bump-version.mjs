import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const pkgPath = path.join(projectRoot, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const current = pkg.version;
const parts = current.split(".").map(Number);
parts[2] += 1; // bump patch
const next = parts.join(".");

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Write GitHub Actions output (works on any shell)
const ghOutput = process.env.GITHUB_OUTPUT;
if (ghOutput) {
  const lines = [`version=${next}`, `current=${current}`].join("\n") + "\n";
  writeFileSync(ghOutput, lines, { flag: "a" });
}

console.log(`Auto-bumped version: ${current} → ${next}`);
