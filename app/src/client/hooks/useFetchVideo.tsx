import { useEffect, useState } from "react";

export function useFetchVideo(videoId: string | null) {
  const [videoKey, setVideoKey] = useState("");

  useEffect(() => {
    if (!videoId) {
      setVideoKey("");
      return;
    }

    const controller = new AbortController();

    (async () => {
      const res = await fetch(`/api/videos/${videoId}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        setVideoKey("");
        return;
      }

      const body = await res.json();
      setVideoKey(body?.videoKey ?? "");
    })().catch(() => {
      setVideoKey("");
    });

    return () => controller.abort();
  }, [videoId]);

  return {
    videoUrl: videoKey ? `/api/cdn/video/${videoKey}` : "",
  };
}
