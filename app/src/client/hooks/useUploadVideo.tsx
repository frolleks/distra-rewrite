import { useState } from "react";

export function useUploadVideo() {
  const [file, setFile] = useState<File | null | undefined>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [videoKey, setVideoKey] = useState("");

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>,
  ) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const res = await fetch("/api/upload");

    if (res) {
      const { url, key } = await res.json();

      await fetch(url, {
        method: "PUT",
        body: await selectedFile.arrayBuffer(),
        headers: {
          "content-type": "video/mp4",
        },
      }).then(() => {
        setHasUploaded(true);
        setVideoKey(key);
      });
    }
  };

  const handleSubmit = async (data: FormData) => {
    const title = data.get("title");
    const description = data.get("description");
    const key = data.get("key");

    await fetch("/api/videos", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        key,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  return { handleUpload, handleSubmit, file, hasUploaded, videoKey };
}
