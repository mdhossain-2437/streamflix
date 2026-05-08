import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AdvancedPlayer,
  type ChapterMarker,
  type SubtitleTrack,
} from "@/components/AdvancedPlayer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { parseCatalogId, useArchiveItem, useContentDetail } from "@/lib/api";

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

// Synthetic chapter markers so HLS demo streams have nav points. Real archive
// titles are full features without chapter metadata, so we synthesize at
// 10-minute intervals so the UI demonstrates the markers.
function syntheticChapters(durationMin: number | null): ChapterMarker[] {
  const dur = durationMin && durationMin > 10 ? durationMin : 90;
  const out: ChapterMarker[] = [];
  for (let i = 0; i < dur; i += 10) {
    out.push({ start: i * 60, title: i === 0 ? "Opening" : `Chapter ${Math.ceil(i / 10) + 1}` });
  }
  return out;
}

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const [, archiveParams] = useRoute("/free/:id");
  const id = params?.id || archiveParams?.id;
  const isArchive = !!archiveParams?.id || (id?.startsWith("archive-") ?? false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const parsed = !isArchive ? parseCatalogId(id) : null;
  const { data: content } = useContentDetail(parsed?.type, parsed?.tmdbId);
  const { data: archive } = useArchiveItem(isArchive ? id : undefined);

  // Restore last position
  const { data: lastProgress } = useQuery<ProgressRecord | null>({
    queryKey: [`/api/viewing-progress/${id}`],
    enabled: !!id,
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
  const fallbackSrc = useMemo(
    () =>
      SAMPLE_SOURCES[
        Math.abs(
          (id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0),
        ) % SAMPLE_SOURCES.length
      ],
    [id],
  );

  const archiveSrc = useMemo(() => {
    if (!isArchive || !archive?.sources?.length) return null;
    // Prefer "best quality" mp4. archive returns sorted by size already.
    const mp4 = archive.sources.find((s) => /mp4/i.test(s.type));
    return mp4?.url || archive.sources[0]?.url || null;
  }, [isArchive, archive]);

  const archiveSubtitles: SubtitleTrack[] = useMemo(() => {
    if (!isArchive || !archive?.subtitles?.length) return [];
    return archive.subtitles.map((s, i) => ({
      src: s.url,
      srclang: s.srclang,
      label: s.label,
      default: i === 0,
    }));
  }, [isArchive, archive]);

  const resolvedSrc = isArchive ? (archiveSrc || fallbackSrc) : fallbackSrc;
  const subtitles = isArchive ? archiveSubtitles : SAMPLE_SUBTITLES;
  const playerTitle = isArchive
    ? archive?.item?.title
    : content?.title;
  const playerPoster = isArchive
    ? archive?.item?.backdropUrl ?? archive?.item?.posterUrl ?? undefined
    : (content?.backdropUrl ?? undefined);

  const chapters = useMemo(
    () => syntheticChapters(isArchive ? archive?.item?.durationMin ?? null : content?.durationMin ?? null),
    [isArchive, archive, content],
  );

  const progressMutation = useMutation({
    mutationFn: async (data: { progressSeconds: number; durationSeconds: number }) => {
      if (!id) return null;
      return apiRequest("POST", "/api/viewing-progress", {
        contentId: id,
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
        poster={playerPoster}
        title={playerTitle}
        subtitles={subtitles}
        chapters={chapters}
        initialPositionSeconds={resumeSeconds}
        autoplay
        onProgress={(cur, dur) => progressMutation.mutate({ progressSeconds: cur, durationSeconds: dur })}
        onBack={() => {
          if (isArchive) setLocation("/free");
          else if (content) setLocation(`/${content.type}/${id}`);
          else setLocation("/");
        }}
        className="w-full h-full"
      />
    </div>
  );
}
