import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardFooter } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { useUploadVideo } from "@/client/hooks/video/useUploadVideo";
import { authClient } from "@/client/lib/auth";
import { cn } from "@/client/lib/utils";
import { RedirectToSignIn } from "@daveyplate/better-auth-ui";
import { useState } from "react";

export default function Upload() {
  const session = authClient.useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const { file, hasUploaded, videoKey, handleSubmit, handleUpload } =
    useUploadVideo();

  if (!session) {
    return <RedirectToSignIn />;
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardContent>
          {currentStep === 0 ? (
            <>
              {file ? (
                <p>{file.name}</p>
              ) : (
                <input id="file-upload" type="file" onChange={handleUpload} />
              )}
            </>
          ) : (
            currentStep === 1 && (
              <div>
                <Input placeholder="Enter the video title..." name="title" />
                <Textarea
                  placeholder="Enter the video description..."
                  name="description"
                />
                <input type="hidden" value={videoKey} name="key" readOnly />
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
