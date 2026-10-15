'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let isYTLoading = false;
let isYTReady = false;
const readyCallbacks: Array<() => void> = [];

function loadYouTubeAPI(callback: () => void) {
  if (isYTReady && window.YT?.Player) {
    callback();
    return;
  }

  readyCallbacks.push(callback);

  if (!isYTLoading && typeof window !== 'undefined') {
    isYTLoading = true;
    const existing = document.getElementById('youtube-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      isYTReady = true;
      if (typeof prevOnReady === 'function') prevOnReady();
      while (readyCallbacks.length > 0) {
        const cb = readyCallbacks.shift();
        if (cb) cb();
      }
    };
  }
}

interface HiddenYouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  startSeconds?: number;
  snippetSeconds?: number;
  volume?: number;
  replayKey?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onTimeUpdate?: (elapsed: number) => void;
}

export function HiddenYouTubePlayer({
  videoId,
  isPlaying,
  startSeconds = 0,
  snippetSeconds = 30,
  volume = 0.5,
  replayKey = 0,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
}: HiddenYouTubePlayerProps) {
  const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);
  const playerRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevReplayKeyRef = useRef(replayKey);
  const prevVideoIdRef = useRef(videoId);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Sync volume to YouTube player
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(Math.round(volume * 100));
      } catch {}
    }
  }, [volume]);

  // Snippet timer: stop playback after snippetSeconds has elapsed
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const current = playerRef.current.getCurrentTime();
          const elapsed = Math.max(0, current - startSeconds);
          if (onTimeUpdateRef.current) onTimeUpdateRef.current(elapsed);
          if (current >= startSeconds + snippetSeconds) {
            playerRef.current.pauseVideo();
            if (onEndedRef.current) onEndedRef.current();
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        } catch {}
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, startSeconds, snippetSeconds]);

  // Initialize and update player when videoId changes
  useEffect(() => {
    if (!videoId) {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        try {
          playerRef.current.stopVideo();
        } catch {}
      }
      return;
    }

    isLoadedRef.current = false;

    loadYouTubeAPI(() => {
      const container = document.getElementById(containerId.current);
      if (!container) return;

      if (!playerRef.current) {
        playerRef.current = new window.YT.Player(containerId.current, {
          height: '1',
          width: '1',
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            start: startSeconds,
          },
          events: {
            onReady: (event: any) => {
              isLoadedRef.current = true;
              event.target.setVolume(Math.round(volume * 100));
              if (isPlaying) {
                event.target.seekTo(startSeconds, true);
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
              if (event.data === 1 && onPlayRef.current) onPlayRef.current();
              if (event.data === 2 && onPauseRef.current) onPauseRef.current();
              if (event.data === 0 && onEndedRef.current) onEndedRef.current();
            },
            onError: () => {
              if (onErrorRef.current) onErrorRef.current();
            },
          },
        });
      } else {
        try {
          playerRef.current.loadVideoById({
            videoId,
            startSeconds,
          });
          playerRef.current.setVolume(Math.round(volume * 100));
          if (isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        } catch {}
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId, startSeconds]);

  // Handle isPlaying prop changes and explicit replay triggers
  useEffect(() => {
    if (!playerRef.current || !videoId) return;
    try {
      const isNewVideo = prevVideoIdRef.current !== videoId;
      const isReplay = prevReplayKeyRef.current !== replayKey;
      prevVideoIdRef.current = videoId;
      prevReplayKeyRef.current = replayKey;

      if (isReplay || isNewVideo) {
        playerRef.current.seekTo(startSeconds, true);
        if (onTimeUpdateRef.current) onTimeUpdateRef.current(0);
      }

      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isPlaying, videoId, replayKey, startSeconds]);

  return (
    <div
      id={containerId.current}
      className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
