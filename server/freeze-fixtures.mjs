// Copies every cached live answer into demo_fixtures/chat.json so the rehearsed
// demo questions get the same wording with the network off.
//
//   node server/freeze-fixtures.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, "cache", "chat");
const target = path.join(root, "demo_fixtures", "chat.json");

const fixtures = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : {};
let added = 0;
if (fs.existsSync(cacheDir)) {
  for (const file of fs.readdirSync(cacheDir)) {
    if (!file.endsWith(".json")) continue;
    const key = file.slice(0, -5);
    if (fixtures[key]) continue;
    fixtures[key] = JSON.parse(fs.readFileSync(path.join(cacheDir, file), "utf8"));
    added += 1;
  }
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(fixtures, null, 2) + "\n");
console.log(`${added} new answers frozen, ${Object.keys(fixtures).length} total in ${path.relative(root, target)}`);
