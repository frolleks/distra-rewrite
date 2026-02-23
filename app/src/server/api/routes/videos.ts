import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { pendingUpload, video } from "@/server/db/schema";
import type { BunRequest } from "bun";
import { eq } from "drizzle-orm";
import z from "zod";

const videoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  key: z.uuidv4(),
});

async function GET(req: BunRequest) {
  const { id } = req.params;

  if (id) {
    const videoResult = await db.query.video.findFirst({
      where: eq(video.id, id),
    });

    return Response.json(videoResult);
  }

  return Response.json({ error: "Bad request." }, { status: 400 });
}

async function POST(req: BunRequest) {
  const session = await auth.api.getSession();

  if (session) {
    const parsed = videoSchema.safeParse(await req.json());

    if (parsed.success) {
      const { title, description, key: videoKey } = parsed.data;
      const keyExists = await db.query.pendingUpload.findFirst({
        where: eq(pendingUpload.id, parsed.data.key),
      });

      if (keyExists) {
        await db
          .insert(video)
          .values({ title, description, videoKey, userId: session.user.id });
      } else {
        return Response.json({ error: "Bad request." }, { status: 400 });
      }
    }

    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  return Response.json({ error: "You must be signed in." }, { status: 403 });
}

export { GET as getVideo, POST as postVideo };
