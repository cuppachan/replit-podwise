import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface PlayerEpisode {
  id: string;
  title: string;
  podcastTitle: string;
  podcastArtwork: string;
  audioUrl: string;
  duration: string;
}

interface AudioPlayerContextType {
  episode: PlayerEpisode | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isLoading: boolean;
  rate: number;
  queueLength: number;
  queueIndex: number;
  play: (episode: PlayerEpisode) => void;
  playQueue: (episodes: PlayerEpisode[]) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  setRate: (rate: number) => void;
  dismiss: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [episode, setEpisode] = useState<PlayerEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [rate, setRateState] = useState(1.0);
  const [autoAdvanceTo, setAutoAdvanceTo] = useState<PlayerEpisode | null>(null);

  const queueRef = useRef<PlayerEpisode[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [queueIndex, setQueueIndex] = useState(-1);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
    return () => {
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  const attachListener = useCallback((player: AudioPlayer) => {
    player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      setIsPlaying(status.playing);
      setPosition(status.currentTime);
      if (status.duration) setDuration(status.duration);
      if (status.isLoaded) setIsLoading(false);
      if (status.didJustFinish) {
        setQueueIndex((prev) => {
          const nextIdx = prev + 1;
          if (nextIdx < queueRef.current.length) {
            setAutoAdvanceTo(queueRef.current[nextIdx]);
            return nextIdx;
          }
          queueRef.current = [];
          setQueueLength(0);
          setIsPlaying(false);
          setPosition(0);
          return -1;
        });
      }
    });
  }, []);

  /**
   * Internal: starts the player for an episode without touching queue state.
   * Called by play(), playQueue(), and auto-advance.
   */
  const startEpisode = useCallback(
    (ep: PlayerEpisode) => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
      setEpisode(ep);
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
      setIsLoading(true);
      const player = createAudioPlayer({ uri: ep.audioUrl }, { updateInterval: 500 });
      playerRef.current = player;
      attachListener(player);
      player.play();
    },
    [attachListener],
  );

  /**
   * Public: play a single episode, clearing any active queue.
   */
  const play = useCallback(
    (ep: PlayerEpisode) => {
      queueRef.current = [];
      setQueueLength(0);
      setQueueIndex(-1);
      startEpisode(ep);
    },
    [startEpisode],
  );

  /**
   * Public: queue a list of episodes and begin playing from the first.
   * Auto-advances through the list on episode completion.
   */
  const playQueue = useCallback(
    (episodes: PlayerEpisode[]) => {
      if (episodes.length === 0) return;
      queueRef.current = episodes;
      setQueueLength(episodes.length);
      setQueueIndex(0);
      startEpisode(episodes[0]);
    },
    [startEpisode],
  );

  useEffect(() => {
    if (!autoAdvanceTo) return;
    setAutoAdvanceTo(null);
    startEpisode(autoAdvanceTo);
  }, [autoAdvanceTo, startEpisode]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(newRate);
    }
  }, []);

  const dismiss = useCallback(() => {
    playerRef.current?.remove();
    playerRef.current = null;
    setEpisode(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    queueRef.current = [];
    setQueueLength(0);
    setQueueIndex(-1);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        episode,
        isPlaying,
        position,
        duration,
        isLoading,
        rate,
        queueLength,
        queueIndex,
        play,
        playQueue,
        togglePlayPause,
        seekTo,
        setRate,
        dismiss,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider');
  return ctx;
}
