import { mkdir } from "node:fs/promises";

async function bootstrapDev() {
  await mkdir("app/data", { recursive: true });
  await mkdir("app/data/s3", { recursive: true });
  await Bun.write("app/data/sqlite.db", "");
}

bootstrapDev();
