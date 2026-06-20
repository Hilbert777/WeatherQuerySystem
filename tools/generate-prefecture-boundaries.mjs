import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(projectRoot, "dist", "client", "data", "china-datav-raw");
const outputFile = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(projectRoot, "client", "public", "data", "china-prefecture-boundaries.geo.json");
const COORDINATE_PRECISION = 4;

if (!fs.existsSync(rawDir)) {
  throw new Error(`DataV raw directory not found: ${rawDir}`);
}

const features = [];
const sourceFiles = fs.readdirSync(rawDir)
  .filter((file) => file.endsWith("_full.json") && file !== "100000_full.json")
  .sort();

for (const file of sourceFiles) {
  const raw = JSON.parse(fs.readFileSync(path.join(rawDir, file), "utf8"));

  for (const feature of raw.features || []) {
    if (!feature.geometry || feature.properties?.level !== "city") {
      continue;
    }

    features.push({
      type: "Feature",
      properties: {
        adcode: feature.properties.adcode,
        name: feature.properties.name,
        level: feature.properties.level,
        parent: feature.properties.parent
      },
      geometry: {
        ...feature.geometry,
        coordinates: roundCoordinates(feature.geometry.coordinates)
      }
    });
  }
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify({ type: "FeatureCollection", features }));

console.log(`Generated ${features.length} prefecture boundary features -> ${outputFile}`);

function roundCoordinates(value) {
  if (typeof value === "number") {
    return Number(value.toFixed(COORDINATE_PRECISION));
  }

  if (Array.isArray(value)) {
    return value.map(roundCoordinates);
  }

  return value;
}
