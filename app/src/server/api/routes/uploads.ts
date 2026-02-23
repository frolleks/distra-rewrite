import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { pendingUpload } from "@/server/db/schema";
import { s3 } from "@/server/s3";
import { type BunRequest } from "bun";

async function GET(req: BunRequest) {
  const randomId = crypto.randomUUID();
  const presignedPutUrl = s3.presign(`distra_videos/${randomId}.mp4`, {
    method: "PUT",
    expiresIn: 3600,
    type: "video/mp4",
    acl: "public-read",
  });

  await db.insert(pendingUpload).values({
    id: randomId,
    expiresAt: new Date(new Date().getTime() + 3600 * 1000),
  });

  return Response.json({ url: presignedPutUrl, key: randomId });
}

export async function uploadsHandler(req: BunRequest) {
  const session = await auth.api.getSession();

  if (session) {
    if (req.method === "GET") {
      return GET(req);
    }
  }

  return Response.json(
    { message: "You must be signed in." },
    {
      status: 403,
    },
  );
}
