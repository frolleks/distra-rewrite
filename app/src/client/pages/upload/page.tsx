import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardFooter } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { authClient } from "@/client/lib/auth";
import { cn } from "@/client/lib/utils";
import { RedirectToSignIn } from "@daveyplate/better-auth-ui";
import { useState } from "react";

export default function Upload() {
  const session = authClient.useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null | undefined>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [videoKey, setVideoKey] = useState("");

  if (!session) {
    return <RedirectToSignIn />;
  }

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

  return (
    <Card>
      <form action={handleSubmit}>
        <CardContent>
          {currentStep === 0 ? (
            <input id="file-upload" type="file" onChange={handleUpload} />
          ) : (
            currentStep === 1 && (
              <div>
                <Input placeholder="Enter the video title..." name="title" />
                <Textarea
                  placeholder="Enter the video description..."
                  name="description"
                />
                <input
                  className="hidden"
                  value={videoKey}
                  name="key"
                  readOnly
                />
              </div>
            )
          )}
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full gap-1.5">
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
              type="button"
              className="flex-1 cursor-pointer w-full"
            >
              Previous
            </Button>
            <Button
              onClick={
                currentStep < 1
                  ? () => setCurrentStep(currentStep + 1)
                  : () => null
              }
              disabled={!hasUploaded}
              type="button"
              className={cn(
                currentStep < 1 && "flex-1 cursor-pointer w-full",
                currentStep === 1 && "hidden",
              )}
            >
              {currentStep < 1 ? `Next` : `Finish`}
            </Button>
            <Button
              onClick={
                currentStep < 1
                  ? () => setCurrentStep(currentStep + 1)
                  : () => null
              }
              disabled={!hasUploaded}
              type="submit"
              className={cn(
                currentStep === 1 && "flex-1 cursor-pointer w-full",
                currentStep < 1 && "hidden",
              )}
            >
              {currentStep < 1 ? `Next` : `Finish`}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
