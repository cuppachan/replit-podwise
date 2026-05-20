import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { parseOPML } from '@/services/opmlParser';
import { fetchEpisodes, fetchFeedXML, parseChannelMeta } from '@/services/rssFetcher';
import { itunesResultToPodcast } from '@/services/itunesApi';
import type { ItunesResult } from '@/services/itunesApi';
import type { Episode, Podcast } from '@/types/podcast';
import { withPodcastDefaults } from '@/types/podcast';
import { applyFeedBehavior } from '@/services/feedBehaviors';

const SUBS_KEY = '@podcast_subscriptions';
const INBOX_KEY = '@podcast_inbox';
const READ_KEY = '@podcast_read_ids';

function getBackfillLimit(podcast: Podcast): number {
  switch (podcast.backfill) {
    case 'latest-only': return 1;
    case 'last-N': return podcast.backfillCount ?? 10;
    case 'all': return 9999;
    default: return 1;
  }
}

interface PodcastContextType {
  subscriptions: Podcast[];
  inbox: Episode[];
  readIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  subscribe: (podcast: Podcast) => Promise<void>;
  unsubscribe: (podcastId: string) => Promise<void>;
  isSubscribed: (podcastId: string) => boolean;
  updateSubscription: (
    podcastId: string,
    updates: Partial<Pick<Podcast, 'tags' | 'feedMode' | 'backfill' | 'backfillCount'>>
  ) => Promise<void>;
  importFromOPML: (opmlText: string) => Promise<{ added: number; errors: number }>;
  subscribeFromItunes: (result: ItunesResult) => Promise<void>;
  refreshInbox: () => Promise<void>;
  markRead: (episodeId: string) => Promise<void>;
}

const PodcastContext = createContext<PodcastContextType | null>(null);

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function PodcastProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Podcast[]>([]);
  const [inbox, setInbox] = useState<Episode[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const [rawSubs, eps, rids] = await Promise.all([
        loadJSON<Podcast[]>(SUBS_KEY, []),
        loadJSON<Episode[]>(INBOX_KEY, []),
        loadJSON<string[]>(READ_KEY, []),
      ]);
      const subs = rawSubs.map((p) => withPodcastDefaults(p));
      setSubscriptions(subs);
      setInbox(eps);
      setReadIds(new Set(rids));
      setLoading(false);
    })();
  }, []);

  const subscribe = useCallback(async (podcast: Podcast) => {
    const full = withPodcastDefaults(podcast);
    setSubscriptions((prev) => {
      if (prev.some((p) => p.id === full.id)) return prev;
      const next = [full, ...prev];
      saveJSON(SUBS_KEY, next);
      return next;
    });
    try {
      const limit = getBackfillLimit(full);
      const rawEpisodes = await fetchEpisodes(full, limit);
      const episodes = applyFeedBehavior(rawEpisodes, full);
      setInbox((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const fresh = episodes.filter((e) => !existingIds.has(e.id));
        const next = [...fresh, ...prev].sort((a, b) => b.publishedAt - a.publishedAt);
        saveJSON(INBOX_KEY, next);
        return next;
      });
    } catch {}
  }, []);

  const unsubscribe = useCallback(async (podcastId: string) => {
    setSubscriptions((prev) => {
      const next = prev.filter((p) => p.id !== podcastId);
      saveJSON(SUBS_KEY, next);
      return next;
    });
    setInbox((prev) => {
      const next = prev.filter((e) => e.podcastId !== podcastId);
      saveJSON(INBOX_KEY, next);
      return next;
    });
  }, []);

  const isSubscribed = useCallback(
    (podcastId: string) => subscriptions.some((p) => p.id === podcastId),
    [subscriptions]
  );

  const updateSubscription = useCallback(
    async (
      podcastId: string,
      updates: Partial<Pick<Podcast, 'tags' | 'feedMode' | 'backfill' | 'backfillCount'>>
    ) => {
      setSubscriptions((prev) => {
        const next = prev.map((p) => (p.id === podcastId ? { ...p, ...updates } : p));
        saveJSON(SUBS_KEY, next);
        return next;
      });
    },
    []
  );

  const subscribeFromItunes = useCallback(
    async (result: ItunesResult) => {
      const podcast = itunesResultToPodcast(result);
      await subscribe(podcast);
    },
    [subscribe]
  );

  const importFromOPML = useCallback(
    async (opmlText: string): Promise<{ added: number; errors: number }> => {
      const entries = parseOPML(opmlText);
      let added = 0;
      let errors = 0;
      const alreadySubscribed = new Set(subscriptions.map((p) => p.feedUrl));
      const toImport = entries.filter((e) => !alreadySubscribed.has(e.feedUrl));

      for (let i = 0; i < toImport.length; i += 3) {
        const batch = toImport.slice(i, i + 3);
        await Promise.all(
          batch.map(async (entry) => {
            try {
              const xml = await fetchFeedXML(entry.feedUrl);
              const meta = parseChannelMeta(xml);
              const podcast = withPodcastDefaults({
                id: `opml_${Math.abs(
                  entry.feedUrl
                    .split('')
                    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) & 0x7fffffff, 0)
                ).toString(36)}`,
                title: meta.title || entry.title,
                author: meta.author,
                description: meta.description,
                artwork: meta.artwork,
                feedUrl: entry.feedUrl,
                subscribedAt: Date.now(),
              });
              await subscribe(podcast);
              added++;
            } catch {
              errors++;
            }
          })
        );
      }
      return { added, errors };
    },
    [subscriptions, subscribe]
  );

  const refreshInbox = useCallback(async () => {
    if (subscriptions.length === 0) return;
    setRefreshing(true);
    try {
      const allEpisodes: Episode[] = [];
      for (let i = 0; i < subscriptions.length; i += 3) {
        const batch = subscriptions.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map(async (p) => {
            const raw = await fetchEpisodes(p, 25);
            return applyFeedBehavior(raw, p);
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') allEpisodes.push(...r.value);
        }
      }
      setInbox((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const fresh = allEpisodes.filter((e) => !existingIds.has(e.id));
        const merged = [...fresh, ...prev]
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .slice(0, 200);
        saveJSON(INBOX_KEY, merged);
        return merged;
      });
    } finally {
      setRefreshing(false);
    }
  }, [subscriptions]);

  const markRead = useCallback(async (episodeId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(episodeId);
      saveJSON(READ_KEY, Array.from(next));
      return next;
    });
  }, []);

  return (
    <PodcastContext.Provider
      value={{
        subscriptions,
        inbox,
        readIds,
        loading,
        refreshing,
        subscribe,
        unsubscribe,
        isSubscribed,
        updateSubscription,
        subscribeFromItunes,
        importFromOPML,
        refreshInbox,
        markRead,
      }}
    >
      {children}
    </PodcastContext.Provider>
  );
}

export function usePodcast(): PodcastContextType {
  const ctx = useContext(PodcastContext);
  if (!ctx) throw new Error('usePodcast must be used within PodcastProvider');
  return ctx;
}
