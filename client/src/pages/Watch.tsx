import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdvancedPlayer, type SubtitleTrack } from "@/components/AdvancedPlayer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { parseCatalogId, useContentDetail } from "@/lib/api";

interface ProgressRecord {
  contentId: string;
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

// Public test HLS streams. Used for the player demo since real movies
// aren't licensed; the player chrome itself is fully production.
const SAMPLE_SOURCES = [
  "https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
];

// Public sample VTT subtitles (Mozilla / TUI test fixtures). Browsers must
// fetch them with crossOrigin=anonymous, which the player sets on the <video>.
const SAMPLE_SUBTITLES: SubtitleTrack[] = [
  {
    src: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/MIB2-subtitles-pt-BR.vtt",
    srclang: "pt",
    label: "Português (BR)",
  },
];

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const parsed = parseCatalogId(params?.id);
  const { data: content } = useContentDetail(parsed?.type, parsed?.tmdbId);

  // Restore last position
  const { data: lastProgress } = useQuery<ProgressRecord | null>({
    queryKey: [`/api/viewing-progress/${params?.id}`],
    enabled: !!params?.id,
    retry: false,
  });

  const [resumeSeconds, setResumeSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (lastProgress && !lastProgress.completed && lastProgress.progressSeconds > 30) {
      setResumeSeconds(lastProgress.progressSeconds);
    } else {
      setResumeSeconds(0);
    }
  }, [lastProgress]);

  // Pseudo-random source selection so each title gets a stable demo stream.
  const resolvedSrc =
    SAMPLE_SOURCES[
      Math.abs(
        (params?.id || "")
          .split("")
          .reduce((acc, c) => acc + c.charCodeAt(0), 0),
      ) % SAMPLE_SOURCES.length
    ];

  const progressMutation = useMutation({
    mutationFn: async (data: { progressSeconds: number; durationSeconds: number }) => {
      if (!params?.id) return null;
      return apiRequest("POST", "/api/viewing-progress", {
        contentId: params.id,
        progressSeconds: Math.floor(data.progressSeconds),
        durationSeconds: Math.floor(data.durationSeconds || 1),
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

  // Wait until we've fetched the saved progress before mounting the player so
  // the resume offset is honored on first render.
  if (resumeSeconds === null) {
    return (
      <div className="fixed inset-0 bg-black grid place-items-center">
        <div className="font-display text-3xl text-primary animate-glow-pulse">
          STREAM<span className="text-foreground">FLIX</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <AdvancedPlayer
        src={resolvedSrc}
        poster={content?.backdropUrl ?? undefined}
        title={content?.title}
        subtitles={SAMPLE_SUBTITLES}
        initialPositionSeconds={resumeSeconds}
        autoplay
        onProgress={(cur, dur) => progressMutation.mutate({ progressSeconds: cur, durationSeconds: dur })}
        onBack={() => setLocation(content ? `/${content.type}/${params?.id}` : "/")}
        className="w-full h-full"
      />
    </div>
  );
}
