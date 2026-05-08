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
import { DownloadDialog } from "@/components/DownloadDialog";
import { getLibraryItem, type MyLibraryItem } from "@/lib/myLibrary";

interface ProgressRecord {
  contentId: string;
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

// Public test HLS streams used for the player demo since real licensed
// titles can't be hosted. All sources below are CORS-enabled so hls.js
// can fetch their segments cleanly. The quality menu surfaces every
// rung the manifest exposes — when the configured stream provides 4K /
// HDR rungs they show up automatically.
const SAMPLE_SOURCES = [
  // Mux Big Buck Bunny — multi-bitrate ladder up to 1080p
  "https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",
  // Tears of Steel — 1920x800 cinematic master
  "https://test-streams.mux.dev/tos_ismc/main.m3u8",
  // Mux test stream — 1080p ladder
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
];

// Public sample VTT subtitles (Mozilla / TUI test fixtures). Hosts must
// expose CORS headers on these files for the <track> element to load them.
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
  const [, libParams] = useRoute("/library/watch/:id");
  const id = params?.id || archiveParams?.id || libParams?.id;
  const isLib = !!libParams?.id || (id?.startsWith("lib-") ?? false);
  const isArchive = !isLib && (!!archiveParams?.id || (id?.startsWith("archive-") ?? false));

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const parsed = !isArchive && !isLib ? parseCatalogId(id) : null;
  const { data: content } = useContentDetail(parsed?.type, parsed?.tmdbId);
  const { data: archive } = useArchiveItem(isArchive ? id : undefined);

  const [libItem, setLibItem] = useState<MyLibraryItem | null>(null);
  useEffect(() => {
    if (isLib && id) {
      void getLibraryItem(id).then((item) => setLibItem(item ?? null));
    } else {
      setLibItem(null);
    }
  }, [isLib, id]);

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

  const libSrc = isLib ? libItem?.videoUrl ?? null : null;

  const archiveSubtitles: SubtitleTrack[] = useMemo(() => {
    if (!isArchive || !archive?.subtitles?.length) return [];
    return archive.subtitles.map((s, i) => ({
      src: s.url,
      srclang: s.srclang,
      label: s.label,
      default: i === 0,
    }));
  }, [isArchive, archive]);

  const resolvedSrc = isLib
    ? libSrc
    : isArchive
      ? archiveSrc || fallbackSrc
      : fallbackSrc;
  const subtitles = isLib ? [] : isArchive ? archiveSubtitles : SAMPLE_SUBTITLES;
  const playerTitle = isLib
    ? libItem?.title
    : isArchive
      ? archive?.item?.title
      : content?.title;
  const playerPoster = isLib
    ? libItem?.coverUrl ?? undefined
    : isArchive
      ? archive?.item?.backdropUrl ?? archive?.item?.posterUrl ?? undefined
      : content?.backdropUrl ?? undefined;

  const chapters = useMemo(
    () =>
      syntheticChapters(
        isLib
          ? null
          : isArchive
            ? archive?.item?.durationMin ?? null
            : content?.durationMin ?? null,
      ),
    [isLib, isArchive, archive, content],
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
  const [downloadOpen, setDownloadOpen] = useState(false);

  if (resumeSeconds === null || (isLib && !libItem) || !resolvedSrc) {
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
          if (isLib) setLocation("/library");
          else if (isArchive) setLocation("/free");
          else if (content) setLocation(`/${content.type}/${id}`);
          else setLocation("/");
        }}
        onDownload={() => setDownloadOpen(true)}
        className="w-full h-full"
      />
      <DownloadDialog
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        source={libSrc || archiveSrc || resolvedSrc}
        title={playerTitle || "Untitled"}
        year={isLib ? libItem?.year : isArchive ? archive?.item?.year : content?.year}
        kind={isLib ? (libItem?.kind === "series" ? "series" : "movie") : isArchive ? "movie" : (parsed?.type === "series" ? "series" : "movie")}
      />
    </div>
  );
}
