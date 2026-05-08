"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Hls from "hls.js";
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

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState("auto");
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const hlsRef = useRef<Hls | null>(null);

  const { data: content } = useQuery<Content>({
    queryKey: [`/api/content/${params?.id}`],
    enabled: !!params?.id,
  });

  // Sample HLS test streams used when content has no real videoUrl yet.
  // These are Mux & Bitmovin public test streams — safe for demos.
  const SAMPLE_SOURCES = [
    "https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  ];

  const resolvedSrc =
    content?.videoUrl && content.videoUrl.length > 0
      ? content.videoUrl
      : SAMPLE_SOURCES[
          Math.abs(
            (params?.id || "")
              .split("")
              .reduce((acc, c) => acc + c.charCodeAt(0), 0),
          ) % SAMPLE_SOURCES.length
        ];

  // Wire HLS.js when the source is an m3u8 playlist; fall back to native
  // playback (Safari / iOS / iPadOS support HLS natively via MSE).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = resolvedSrc.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const heights = data.levels.map((l) => `${l.height}p`);
        setAvailableLevels(["auto", ...heights]);
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      video.src = resolvedSrc;
    } else {
      video.src = resolvedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedSrc]);

  // Switch quality level by name
  useEffect(() => {
    if (!hlsRef.current) return;
    if (quality === "auto") {
      hlsRef.current.currentLevel = -1;
      return;
    }
    const target = parseInt(quality.replace("p", ""), 10);
    const idx = hlsRef.current.levels.findIndex((l) => l.height === target);
    if (idx >= 0) hlsRef.current.currentLevel = idx;
  }, [quality]);

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
          window.location.href = "/sign-in";
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
      className="relative h-screen bg-black overflow-hidden"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={content?.backdropUrl || content?.thumbnailUrl || ""}
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
        data-testid="video-player"
      />

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute top-0 left-0 right-0 px-6 py-5 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/15 rounded-full h-11 w-11"
            data-testid="button-back-player"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          {content && (
            <div className="text-white text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                Now playing
              </p>
              <h2 className="font-display text-2xl tracking-wide">{content.title}</h2>
            </div>
          )}
          <div className="w-10" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-3 space-y-3">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer [&_[role=slider]]:bg-primary [&_[role=slider]]:shadow-glow-sm"
            data-testid="slider-progress"
          />

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/15 rounded-full h-12 w-12"
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
                className="text-white hover:bg-white/15 rounded-full h-11 w-11"
                data-testid="button-skip"
              >
                <SkipForward className="w-6 h-6" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/15 rounded-full h-11 w-11"
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

              <span className="text-sm tabular-nums text-white/85" data-testid="text-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/15 rounded-full h-11 w-11"
                    data-testid="button-quality"
                  >
                    <Settings className="w-6 h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass">
                  {(availableLevels.length > 0
                    ? availableLevels
                    : ["auto", "1080p", "720p", "480p"]).map((level) => (
                    <DropdownMenuItem
                      key={level}
                      onClick={() => setQuality(level)}
                      className="capitalize"
                    >
                      {level} {quality === level && "✓"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/15 rounded-full h-11 w-11"
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
