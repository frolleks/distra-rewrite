import { useFetchVideo } from "@/client/hooks/useFetchVideo";
import { useSearchParams } from "react-router-dom";

export default function Watch() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("v");
  const { videoUrl } = useFetchVideo(videoId);

  return (
    <div>
      <video src={videoUrl} controls></video>
    </div>
  );
}
