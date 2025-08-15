import * as fs from "fs";
import * as path from "path";

const ENGINE_PATH = path.resolve(
  process.cwd(),
  "node_modules/@ghostery/trackerdb/dist/trackerdb.engine"
);
const OUTPUT_FILE = "engine-base64.txt";
const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);

async function generateEngineBase64() {
  try {
    console.log(`📂 Reading engine from: ${ENGINE_PATH}`);
    const buffer = await fs.promises.readFile(ENGINE_PATH);
    const base64 = buffer.toString("base64");
    await fs.promises.writeFile(outputPath, base64, "utf-8");
    console.log(`✅ Successfully wrote base64 to: ${OUTPUT_FILE}`);
  } catch (err) {
    console.error(`❌ Failed to generate engine-base64.txt:`, err);
  }
}

generateEngineBase64();
