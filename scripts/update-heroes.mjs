import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previous = JSON.parse(
  await fs.readFile(path.join(root, "src/heroes.json"), "utf8"),
);
const response = await fetch("https://statlocker.gg/api/info/heroes-full");
if (!response.ok)
  throw Error(
    `Hero catalogue returned HTTP ${response.status}. Existing assets were kept.`,
  );
const all = await response.json();
const heroes = all
  .filter((h) => h.player_selectable && !h.in_development && !h.prerelease_only)
  .map((h) => ({
    id: h.id,
    name: h.name,
    image: `/heroes/${h.id}.webp`,
    source: h.images.icon_hero_card_webp,
    gloatImage: h.images.hero_card_gloat_webp,
    criticalImage: h.images.hero_card_critical_webp,
    voiceLines: previous.find((hero) => hero.id === h.id)?.voiceLines || [],
  }));
const cards = await Promise.all(
  heroes.map(async (hero) => {
    if (
      !Number.isSafeInteger(hero.id) ||
      new URL(hero.source).hostname !== "assets-bucket.deadlock-api.com" ||
      !hero.source.startsWith("https://")
    )
      throw Error("Unexpected hero image source.");
    const r = await fetch(hero.source);
    if (!r.ok) throw Error(`${hero.name}: HTTP ${r.status}`);
    return { hero, bytes: Buffer.from(await r.arrayBuffer()) };
  }),
);
await fs.mkdir(path.join(root, "public/heroes"), { recursive: true });
for (const { hero, bytes } of cards)
  await fs.writeFile(path.join(root, `public/heroes/${hero.id}.webp`), bytes);
await fs.writeFile(
  path.join(root, "src/heroes.json"),
  JSON.stringify(heroes, null, 2) + "\n",
);
console.log(
  `Updated ${heroes.length} hero cards. Run npm run build before deployment.`,
);
const missing = heroes.filter((hero) => !hero.voiceLines.length);
if (missing.length)
  console.warn(
    "Add verified hero-select voice URLs for: " +
      missing.map((hero) => hero.name).join(", "),
  );
