import { s3 } from "@/server/s3";
import type { BunRequest } from "bun";

export async function cdnGetVideo(req: BunRequest) {
  try {
    const { id } = req.params;

    const obj = s3.file(`distra_videos/${id}.mp4`, {
      type: "video/mp4",
    });

    if (await obj.exists()) {
      const stream = obj.stream();
      return new Response(stream, {
        headers: {
          "Content-Type": obj.type,
        },
      });
    }

    return Response.json({ error: "Video not found." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
