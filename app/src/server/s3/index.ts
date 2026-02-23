import { createClient } from "@distra/s3";

export const s3 =
  process.env.S3_PROVIDER === "local"
    ? createClient("local", { root: "data/s3" })
    : createClient("cloud", { endpoint: process.env.S3_ENDPOINT });
