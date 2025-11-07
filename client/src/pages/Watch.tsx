import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  ChevronLeft,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Content } from "@shared/schema";

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState("1080p");

  const { data: content } = useQuery<Content>({
    queryKey: [`/api/content/${params?.id}`],
    enabled: !!params?.id,
  });

  const progressMutation = useMutation({
    mutationFn: async (progressData: { progressSeconds: number; durationSeconds: number }) => {
      return apiRequest("POST", "/api/viewing-progress", {
        contentId: params?.id,
        ...progressData,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const interval = setInterval(() => {
        progressMutation.mutate({
          progressSeconds: Math.floor(currentTime),
          durationSeconds: Math.floor(duration),
        });
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [currentTime, duration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, duration);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative h-screen bg-black"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        src={content?.videoUrl || ""}
        poster={content?.backdropUrl || content?.thumbnailUrl || ""}
        onClick={togglePlay}
        data-testid="video-player"
      />

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(-1)}
            className="text-white hover:bg-white/20"
            data-testid="button-back-player"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          {content && (
            <div className="text-white">
              <h2 className="text-xl font-semibold">{content.title}</h2>
            </div>
          )}
          <div className="w-10" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            data-testid="slider-progress"
          />

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                className="text-white hover:bg-white/20"
                data-testid="button-skip"
              >
                <SkipForward className="w-6 h-6" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                  data-testid="button-mute"
                >
                  {isMuted ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </Button>
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                  data-testid="slider-volume"
                />
              </div>

              <span className="text-sm" data-testid="text-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    data-testid="button-quality"
                  >
                    <Settings className="w-6 h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setQuality("1080p")}>
                    1080p {quality === "1080p" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("720p")}>
                    720p {quality === "720p" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("480p")}>
                    480p {quality === "480p" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setQuality("Auto")}>
                    Auto {quality === "Auto" && "✓"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                data-testid="button-fullscreen"
              >
                <Maximize className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
