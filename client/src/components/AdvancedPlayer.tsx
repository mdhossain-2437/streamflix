// Production-quality video player. Wraps HLS.js for adaptive streaming and
// adds a custom Netflix-style chrome with: play/pause, seek (with hover scrub
// preview), volume, mute, fullscreen, picture-in-picture, theater mode,
// playback speed (0.25x–2x), quality selector, audio tracks, subtitle tracks,
// keyboard shortcuts, double-click ±10s seek, and resume-from-position.
//
// Keyboard map (focused state):
//   Space / k   – play/pause
//   ←  / j      – seek -10s
//   →  / l      – seek +10s
//   ↑/↓         – volume ±5%
//   m           – mute
//   f           – fullscreen
//   t           – theater mode
//   p           – picture-in-picture
//   c           – cycle subtitles
//   ,/.         – frame nudge ±1/30s while paused
//   0–9         – seek to 0%, 10%, 20% … 90%
//
// Subtitle handling: <track> elements rendered for each provided VTT URL.
// Selecting one toggles `mode = "showing"` on its TextTrack.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Hls, { type Level } from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, ChevronLeft, ChevronRight,
  PictureInPicture2, Settings2, Subtitles, Gauge, Tv, RotateCcw, FastForward,
  Camera, Repeat, Activity, Sun, Palette, ZoomIn, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SubtitleTrack {
  src: string;
  srclang: string;
  label: string;
  default?: boolean;
}

export interface AudioTrack {
  src: string;
  language: string;
  label: string;
}

export interface ChapterMarker {
  start: number; // seconds
  title: string;
}

export type ColorFilter = "none" | "warm" | "cool" | "mono" | "vivid" | "noir";

export interface AdvancedPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  subtitles?: SubtitleTrack[];
  chapters?: ChapterMarker[];
  initialPositionSeconds?: number;
  onProgress?: (currentSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
  onBack?: () => void;
  onDownload?: () => void;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

export interface AdvancedPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  toggleSubtitles: (langCode: string | null) => void;
  setSpeed: (rate: number) => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export const AdvancedPlayer = forwardRef<AdvancedPlayerHandle, AdvancedPlayerProps>(
  function AdvancedPlayer(
    {
      src,
      poster,
      title,
      subtitles = [],
      chapters = [],
      initialPositionSeconds = 0,
      onProgress,
      onEnded,
      onBack,
      onDownload,
      className,
      autoplay = true,
      muted = false,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);
    const seekedToInitial = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(muted);
    const [volume, setVolume] = useState(100);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPip, setIsPip] = useState(false);
    const [isTheater, setIsTheater] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [levels, setLevels] = useState<Level[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1);
    const [activeSubtitleLang, setActiveSubtitleLang] = useState<string | null>(null);
    const [seekPreview, setSeekPreview] = useState<{ x: number; t: number } | null>(null);
    const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | "fwd" | "back" | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [brightness, setBrightness] = useState(100);
    const [zoom, setZoom] = useState(100);
    const [colorFilter, setColorFilter] = useState<ColorFilter>("none");
    const [loopMarkA, setLoopMarkA] = useState<number | null>(null);
    const [loopMarkB, setLoopMarkB] = useState<number | null>(null);
    const [bufferHealth, setBufferHealth] = useState(0);
    const [downloadKbps, setDownloadKbps] = useState(0);
    const [droppedFrames, setDroppedFrames] = useState(0);
    const [touchSeekDelta, setTouchSeekDelta] = useState<number | null>(null);
    const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

    // ──────────────────────────────────────────────────────
    // HLS setup
    // ──────────────────────────────────────────────────────
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      seekedToInitial.current = false;
      setIsLoading(true);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const isHls = src.includes(".m3u8");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 60,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hls.levels);
          setIsLoading(false);
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          setCurrentLevel(data.level);
        });
        hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
          const stats = data.frag.stats;
          if (stats?.loaded && stats.loading?.end && stats.loading?.start) {
            const elapsed = (stats.loading.end - stats.loading.start) / 1000;
            if (elapsed > 0) {
              setDownloadKbps(Math.round((stats.loaded * 8) / 1000 / elapsed));
            }
          }
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) console.error("[player] HLS fatal", data);
        });
      } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        video.src = src;
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src]);

    // ──────────────────────────────────────────────────────
    // Time / state syncing
    // ──────────────────────────────────────────────────────
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      const updateTime = () => {
        setCurrentTime(video.currentTime);
        if (video.buffered.length > 0) {
          const end = video.buffered.end(video.buffered.length - 1);
          setBufferedEnd(end);
          setBufferHealth(Math.max(0, end - video.currentTime));
        }
        const q = (video as HTMLVideoElement & { getVideoPlaybackQuality?: () => { droppedVideoFrames: number } }).getVideoPlaybackQuality?.();
        if (q) setDroppedFrames(q.droppedVideoFrames);
        // A-B loop enforcement
        if (loopMarkA !== null && loopMarkB !== null && video.currentTime >= loopMarkB) {
          video.currentTime = loopMarkA;
        }
      };
      const onLoaded = () => {
        setDuration(video.duration || 0);
        setIsLoading(false);
        if (
          !seekedToInitial.current &&
          initialPositionSeconds > 0 &&
          initialPositionSeconds < (video.duration || 0) - 5
        ) {
          video.currentTime = initialPositionSeconds;
          seekedToInitial.current = true;
        }
        if (autoplay) {
          video.play().catch(() => {
            // Autoplay may be blocked; show controls so user can hit play.
            setIsPlaying(false);
            setShowControls(true);
          });
        }
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onWaiting = () => setIsLoading(true);
      const onPlaying = () => setIsLoading(false);
      const onEndedEvt = () => {
        setIsPlaying(false);
        onEnded?.();
      };
      const onVolume = () => {
        setVolume(Math.round(video.volume * 100));
        setIsMuted(video.muted);
      };
      video.addEventListener("timeupdate", updateTime);
      video.addEventListener("progress", updateTime);
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("ended", onEndedEvt);
      video.addEventListener("volumechange", onVolume);
      return () => {
        video.removeEventListener("timeupdate", updateTime);
        video.removeEventListener("progress", updateTime);
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("ended", onEndedEvt);
        video.removeEventListener("volumechange", onVolume);
      };
    }, [initialPositionSeconds, autoplay, onEnded, loopMarkA, loopMarkB]);

    // ──────────────────────────────────────────────────────
    // Progress reporting (every 5s + on pause/end)
    // ──────────────────────────────────────────────────────
    useEffect(() => {
      if (!duration || !onProgress) return;
      const t = setInterval(() => {
        onProgress(currentTime, duration);
      }, 5000);
      return () => clearInterval(t);
    }, [currentTime, duration, onProgress]);

    // ──────────────────────────────────────────────────────
    // Imperative API
    // ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (s: number) => {
        if (videoRef.current) videoRef.current.currentTime = s;
      },
      toggleSubtitles: (langCode) => activateSubtitle(langCode),
      setSpeed: (rate) => {
        if (videoRef.current) videoRef.current.playbackRate = rate;
        setSpeed(rate);
      },
    }));

    // ──────────────────────────────────────────────────────
    // Controls
    // ──────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        video.play();
        setShowCenterIcon("play");
      } else {
        video.pause();
        setShowCenterIcon("pause");
      }
      setTimeout(() => setShowCenterIcon(null), 350);
    }, []);

    const seekBy = useCallback((delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
    }, []);

    const seekTo = useCallback((seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(video.duration || 0, seconds));
    }, []);

    const toggleMute = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
    }, []);

    const setVol = useCallback((v: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = Math.max(0, Math.min(1, v / 100));
      if (v > 0) video.muted = false;
    }, []);

    const enterFullscreen = useCallback(async () => {
      const el = containerRef.current;
      if (!el) return;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    }, []);

    useEffect(() => {
      const onFs = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", onFs);
      return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const togglePip = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setIsPip(false);
        } else {
          await video.requestPictureInPicture();
          setIsPip(true);
        }
      } catch (e) {
        console.warn("[player] PiP unsupported:", e);
      }
    }, []);

    const changeQuality = useCallback((idx: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = idx;
        setCurrentLevel(idx);
      }
    }, []);

    const changeSpeed = useCallback((rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setSpeed(rate);
    }, []);

    const activateSubtitle = useCallback(
      (lang: string | null) => {
        const video = videoRef.current;
        if (!video) return;
        const tracks = video.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = lang && tracks[i].language === lang ? "showing" : "hidden";
        }
        setActiveSubtitleLang(lang);
      },
      [],
    );

    const takeScreenshot = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const slug = (title || "frame").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          a.download = `${slug}-${Math.round(video.currentTime)}s.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, "image/png");
      } catch (e) {
        console.warn("[player] screenshot failed (CORS?)", e);
      }
    }, [title]);

    const setLoopA = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      setLoopMarkA(v.currentTime);
    }, []);
    const setLoopB = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      setLoopMarkB(v.currentTime);
    }, []);
    const clearLoop = useCallback(() => {
      setLoopMarkA(null);
      setLoopMarkB(null);
    }, []);

    const cycleColorFilter = useCallback(() => {
      const order: ColorFilter[] = ["none", "warm", "cool", "vivid", "mono", "noir"];
      setColorFilter((c) => order[(order.indexOf(c) + 1) % order.length]);
    }, []);

    // ──────────────────────────────────────────────────────
    // Auto-hide controls
    // ──────────────────────────────────────────────────────
    const bumpControls = useCallback(() => {
      setShowControls(true);
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = window.setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }, 3000);
    }, []);

    useEffect(() => {
      bumpControls();
      return () => {
        if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
      };
    }, [bumpControls]);

    // ──────────────────────────────────────────────────────
    // Keyboard shortcuts
    // ──────────────────────────────────────────────────────
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        )
          return;
        const video = videoRef.current;
        if (!video) return;
        switch (e.key) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "ArrowLeft":
          case "j":
            e.preventDefault();
            seekBy(-10);
            break;
          case "ArrowRight":
          case "l":
            e.preventDefault();
            seekBy(10);
            break;
          case "ArrowUp":
            e.preventDefault();
            setVol(Math.min(100, volume + 5));
            break;
          case "ArrowDown":
            e.preventDefault();
            setVol(Math.max(0, volume - 5));
            break;
          case "m":
            toggleMute();
            break;
          case "f":
            enterFullscreen();
            break;
          case "p":
            togglePip();
            break;
          case "t":
            setIsTheater((x) => !x);
            break;
          case "c":
            // Cycle through available subtitle tracks: off → first → second → off
            if (subtitles.length > 0) {
              const order = [null, ...subtitles.map((s) => s.srclang)];
              const idx = order.indexOf(activeSubtitleLang);
              const next = order[(idx + 1) % order.length];
              activateSubtitle(next);
            }
            break;
          case ",":
            if (video.paused) video.currentTime -= 1 / 30;
            break;
          case ".":
            if (video.paused) video.currentTime += 1 / 30;
            break;
          case "i":
            setShowStats((s) => !s);
            break;
          case "s":
            takeScreenshot();
            break;
          case "[":
            setLoopA();
            break;
          case "]":
            setLoopB();
            break;
          case "\\":
            clearLoop();
            break;
          case "r":
            cycleColorFilter();
            break;
          case "n":
            // Jump to next chapter
            if (chapters.length > 0) {
              const next = chapters.find((c) => c.start > video.currentTime + 0.5);
              if (next) video.currentTime = next.start;
            }
            break;
          case "N":
            // Jump to previous chapter
            if (chapters.length > 0) {
              const prev = [...chapters].reverse().find((c) => c.start < video.currentTime - 1);
              if (prev) video.currentTime = prev.start;
            }
            break;
          default:
            if (/^[0-9]$/.test(e.key)) {
              const pct = Number(e.key) / 10;
              if (video.duration) video.currentTime = pct * video.duration;
            }
        }
        bumpControls();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [
      togglePlay, seekBy, setVol, toggleMute, enterFullscreen, togglePip,
      activateSubtitle, activeSubtitleLang, subtitles, volume, bumpControls,
      takeScreenshot, setLoopA, setLoopB, clearLoop, cycleColorFilter, chapters,
    ]);

    // ──────────────────────────────────────────────────────
    // Seek scrub bar
    // ──────────────────────────────────────────────────────
    const onScrubMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        setSeekPreview({ x, t: ratio * (duration || 0) });
      },
      [duration],
    );

    const onScrubLeave = useCallback(() => setSeekPreview(null), []);
    const onScrubClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        seekTo(ratio * (duration || 0));
      },
      [duration, seekTo],
    );

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferPct = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

    const sortedLevels = useMemo(
      () =>
        levels
          .map((l, i) => ({ ...l, index: i }))
          .sort((a, b) => (b.height || 0) - (a.height || 0)),
      [levels],
    );

    const videoFilter = useMemo(() => {
      const filters: string[] = [];
      if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
      switch (colorFilter) {
        case "warm":
          filters.push("sepia(0.25) saturate(1.15) hue-rotate(-5deg)");
          break;
        case "cool":
          filters.push("saturate(1.05) hue-rotate(15deg)");
          break;
        case "mono":
          filters.push("grayscale(1) contrast(1.1)");
          break;
        case "vivid":
          filters.push("saturate(1.5) contrast(1.1)");
          break;
        case "noir":
          filters.push("grayscale(1) contrast(1.5) brightness(0.95)");
          break;
        case "none":
        default:
          break;
      }
      return filters.length ? filters.join(" ") : "none";
    }, [brightness, colorFilter]);

    const videoTransform = useMemo(() => `scale(${zoom / 100})`, [zoom]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, []);

    const onTouchMove = useCallback(
      (e: React.TouchEvent) => {
        const start = touchStartRef.current;
        if (!start) return;
        const t = e.touches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe → preview seek delta (don't commit until end).
          setTouchSeekDelta(Math.round(dx / 6));
        }
      },
      [],
    );

    const onTouchEnd = useCallback(() => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const elapsed = Date.now() - start.t;
      if (touchSeekDelta !== null) {
        seekBy(touchSeekDelta);
        setTouchSeekDelta(null);
        return;
      }
      // Tap → play/pause; double-tap left/right → ±10s.
      if (elapsed < 300) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const xRatio = (start.x - rect.left) / rect.width;
          if (xRatio < 0.3) {
            seekBy(-10);
            setShowCenterIcon("back");
            setTimeout(() => setShowCenterIcon(null), 350);
            return;
          }
          if (xRatio > 0.7) {
            seekBy(10);
            setShowCenterIcon("fwd");
            setTimeout(() => setShowCenterIcon(null), 350);
            return;
          }
        }
        togglePlay();
      }
    }, [touchSeekDelta, seekBy, togglePlay]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative bg-black overflow-hidden",
          isTheater ? "w-full max-w-[1600px] mx-auto aspect-video" : "w-full h-full",
          className,
        )}
        onMouseMove={bumpControls}
        onMouseLeave={() => setShowControls(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-testid="advanced-player"
      >
        <video
          ref={videoRef}
          className="w-full h-full transition-transform"
          style={{ filter: videoFilter, transform: videoTransform }}
          poster={poster || undefined}
          playsInline
          crossOrigin="anonymous"
          onClick={togglePlay}
          onDoubleClick={(e) => {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLVideoElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            seekBy(x < rect.width / 2 ? -10 : 10);
          }}
        >
          {subtitles.map((s) => (
            <track
              key={s.srclang}
              kind="subtitles"
              src={s.src}
              srcLang={s.srclang}
              label={s.label}
              default={s.default}
            />
          ))}
        </video>

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Center play/pause / skip icon flash */}
        {showCenterIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full p-6 animate-fade-out">
              {showCenterIcon === "play" ? (
                <Play className="w-10 h-10 fill-white text-white" />
              ) : showCenterIcon === "pause" ? (
                <Pause className="w-10 h-10 fill-white text-white" />
              ) : showCenterIcon === "fwd" ? (
                <FastForward className="w-10 h-10 fill-white text-white" />
              ) : (
                <RotateCcw className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
        )}

        {/* Touch-swipe seek hint */}
        {touchSeekDelta !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-white px-4 py-2 rounded-full font-mono text-sm">
              {touchSeekDelta >= 0 ? "+" : ""}{touchSeekDelta}s
            </div>
          </div>
        )}

        {/* Stats overlay (toggle with `i`) */}
        {showStats && (
          <div className="absolute top-16 right-4 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-xs font-mono text-white/90 space-y-1 pointer-events-none z-30">
            <div className="text-white font-bold mb-1">Stats for nerds</div>
            <div>Bandwidth: <span className="text-emerald-400">{downloadKbps} kbps</span></div>
            <div>Buffer: <span className={cn(bufferHealth > 5 ? "text-emerald-400" : "text-amber-400")}>{bufferHealth.toFixed(1)} s</span></div>
            <div>Dropped frames: <span className={cn(droppedFrames > 30 ? "text-red-400" : "text-emerald-400")}>{droppedFrames}</span></div>
            <div>Resolution: <span>{(videoRef.current?.videoWidth || 0)}×{(videoRef.current?.videoHeight || 0)}</span></div>
            <div>Speed: <span>{speed}x</span></div>
            {currentLevel >= 0 && levels[currentLevel] && (
              <div>Level: <span>{levels[currentLevel].height}p @ {Math.round((levels[currentLevel].bitrate || 0) / 1000)}kbps</span></div>
            )}
          </div>
        )}

        {/* A-B loop banner */}
        {(loopMarkA !== null || loopMarkB !== null) && (
          <div className="absolute top-16 left-4 bg-primary/90 text-white text-xs font-mono px-3 py-1.5 rounded-full z-30 pointer-events-none">
            Loop {loopMarkA !== null ? fmt(loopMarkA) : "—"} → {loopMarkB !== null ? fmt(loopMarkB) : "—"}
          </div>
        )}

        {/* Top bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 px-4 md:px-6 py-4 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 flex items-center gap-3",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
              data-testid="player-back"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          {title && (
            <div className="text-white text-sm md:text-base font-medium truncate">
              {title}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 px-3 md:px-6 pb-3 md:pb-4 pt-12 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Scrub bar */}
          <div
            className="relative h-2 bg-white/15 rounded-full mb-3 cursor-pointer group/scrub"
            onMouseMove={onScrubMove}
            onMouseLeave={onScrubLeave}
            onClick={onScrubClick}
            data-testid="player-scrub"
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
              style={{ width: `${bufferPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${progressPct}%` }}
            />
            {/* A-B loop region */}
            {loopMarkA !== null && loopMarkB !== null && duration > 0 && (
              <div
                className="absolute inset-y-0 bg-amber-400/40 rounded-full pointer-events-none"
                style={{
                  left: `${(loopMarkA / duration) * 100}%`,
                  width: `${((loopMarkB - loopMarkA) / duration) * 100}%`,
                }}
              />
            )}
            {/* Chapter markers */}
            {chapters.map((c, i) => duration > 0 && c.start > 0 && c.start < duration && (
              <div
                key={i}
                className="absolute top-0 w-0.5 h-full bg-white/70 hover:bg-white pointer-events-none"
                style={{ left: `${(c.start / duration) * 100}%` }}
                title={c.title}
              />
            ))}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
            {seekPreview && (
              <div
                className="absolute -top-9 -translate-x-1/2 bg-black/90 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none"
                style={{ left: seekPreview.x }}
              >
                {(() => {
                  // Show chapter title if hovering inside one.
                  const inChapter = [...chapters].reverse().find((c) => c.start <= seekPreview.t);
                  return inChapter ? `${inChapter.title} · ${fmt(seekPreview.t)}` : fmt(seekPreview.t);
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 text-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/10 h-9 w-9"
              data-testid="player-playpause"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => seekBy(-10)}
              className="text-white hover:bg-white/10 h-9 w-9"
              data-testid="player-back10"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => seekBy(10)}
              className="text-white hover:bg-white/10 h-9 w-9"
              data-testid="player-fwd10"
            >
              <FastForward className="w-5 h-5" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 group/vol">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/10 h-9 w-9"
                data-testid="player-mute"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <div className="w-0 group-hover/vol:w-24 transition-all duration-200 overflow-hidden">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(v) => setVol(v[0])}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="text-xs md:text-sm font-mono px-2 select-none">
              {fmt(currentTime)} <span className="opacity-50">/</span> {fmt(duration)}
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
              {subtitles.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-white hover:bg-white/10 h-9 w-9",
                        activeSubtitleLang && "text-primary",
                      )}
                      data-testid="player-subtitles"
                    >
                      <Subtitles className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white">
                    <DropdownMenuLabel>Subtitles</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => activateSubtitle(null)}
                      className={!activeSubtitleLang ? "text-primary" : ""}
                    >
                      Off
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {subtitles.map((s) => (
                      <DropdownMenuItem
                        key={s.srclang}
                        onClick={() => activateSubtitle(s.srclang)}
                        className={activeSubtitleLang === s.srclang ? "text-primary" : ""}
                      >
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9"
                    data-testid="player-speed"
                  >
                    <Gauge className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white">
                  <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                  {SPEEDS.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={speed === s ? "text-primary" : ""}
                    >
                      {s}x{s === 1 ? " (Normal)" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Screenshot */}
              <Button
                variant="ghost"
                size="icon"
                onClick={takeScreenshot}
                className="text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex"
                data-testid="player-screenshot"
                title="Screenshot (S)"
              >
                <Camera className="w-5 h-5" />
              </Button>

              {/* A-B Loop */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex",
                      (loopMarkA !== null || loopMarkB !== null) && "text-primary",
                    )}
                    data-testid="player-loop"
                    title="A-B Loop"
                  >
                    <Repeat className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white">
                  <DropdownMenuLabel>A-B Loop</DropdownMenuLabel>
                  <DropdownMenuItem onClick={setLoopA}>
                    Set A {loopMarkA !== null ? `(${fmt(loopMarkA)})` : ""}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={setLoopB}>
                    Set B {loopMarkB !== null ? `(${fmt(loopMarkB)})` : ""}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearLoop}>Clear loop</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Color filter cycler */}
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleColorFilter}
                className={cn(
                  "text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex",
                  colorFilter !== "none" && "text-primary",
                )}
                data-testid="player-filter"
                title={`Color filter: ${colorFilter} (R)`}
              >
                <Palette className="w-5 h-5" />
              </Button>

              {/* Brightness + Zoom */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex"
                    data-testid="player-brightness"
                    title="Brightness & Zoom"
                  >
                    <Sun className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white w-64 p-3">
                  <div className="text-xs font-medium mb-2 flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5" /> Brightness · {brightness}%
                  </div>
                  <Slider
                    value={[brightness]}
                    min={50}
                    max={150}
                    step={5}
                    onValueChange={(v) => setBrightness(v[0])}
                    className="mb-4"
                  />
                  <div className="text-xs font-medium mb-2 flex items-center gap-2">
                    <ZoomIn className="w-3.5 h-3.5" /> Zoom · {zoom}%
                  </div>
                  <Slider
                    value={[zoom]}
                    min={100}
                    max={200}
                    step={5}
                    onValueChange={(v) => setZoom(v[0])}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Stats */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStats((s) => !s)}
                className={cn(
                  "text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex",
                  showStats && "text-primary",
                )}
                data-testid="player-stats"
                title="Stats for nerds (I)"
              >
                <Activity className="w-5 h-5" />
              </Button>

              {sortedLevels.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10 h-9 w-9"
                      data-testid="player-quality"
                    >
                      <Settings2 className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white">
                    <DropdownMenuLabel>Quality</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => changeQuality(-1)}
                      className={currentLevel === -1 ? "text-primary" : ""}
                    >
                      Auto
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {sortedLevels.map((l) => (
                      <DropdownMenuItem
                        key={l.index}
                        onClick={() => changeQuality(l.index)}
                        className={currentLevel === l.index ? "text-primary" : ""}
                      >
                        {l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}kbps`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTheater((x) => !x)}
                className={cn("text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex", isTheater && "text-primary")}
                data-testid="player-theater"
                title="Theater (T)"
              >
                <Tv className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePip}
                className={cn("text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex", isPip && "text-primary")}
                data-testid="player-pip"
                title="Picture-in-Picture (P)"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </Button>

              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDownload}
                  className="text-white hover:bg-white/10 h-9 w-9 hidden md:inline-flex"
                  data-testid="player-download"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={enterFullscreen}
                className="text-white hover:bg-white/10 h-9 w-9"
                data-testid="player-fullscreen"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// Used by the unused-import lint check; ChevronRight import is kept for
// potential future "next episode" button.
void ChevronRight;
