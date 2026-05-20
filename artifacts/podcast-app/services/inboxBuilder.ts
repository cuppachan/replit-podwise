import type { PlayerEpisode } from '@/context/AudioPlayerContext';
import { applyFeedBehavior } from '@/services/feedBehaviors';
import type { Episode, FeedMode, Podcast } from '@/types/podcast';

export type InboxFilter =
  | { type: 'all' }
  | { type: 'tag'; tag: string }
  | { type: 'podcast'; podcastId: string };

function getBackfillLimit(podcast: Podcast): number {
  switch (podcast.backfill) {
    case 'latest-only': return 1;
    case 'last-N': return podcast.backfillCount ?? 10;
    case 'all': return 9999;
    default: return 1;
  }
}

function roundRobinMerge(groups: Episode[][]): Episode[] {
  const result: Episode[] = [];
  const maxLen = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) result.push(group[i]);
    }
  }
  return result;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Injects back-catalog episodes at every 10th total slot, cycling through pool.
 * Slots 10, 20, 30, … receive pool[i % pool.length]. All other slots are base episodes.
 */
function injectOneInTen(base: Episode[], pool: Episode[]): Episode[] {
  if (pool.length === 0) return base;
  const result: Episode[] = [];
  let baseIdx = 0;
  while (baseIdx < base.length) {
    const nextPos = result.length + 1;
    if (nextPos % 10 === 0) {
      result.push(pool[(nextPos / 10 - 1) % pool.length]);
    } else {
      result.push(base[baseIdx++]);
    }
  }
  return result;
}

/**
 * Ordering-only sort for filtered views. Returns ALL matching episodes;
 * never samples. 1-in-10 and random-pick fall back to newest-first so the
 * full episode list is visible.
 */
function orderForFilter(episodes: Episode[], feedMode: FeedMode): Episode[] {
  const sorted = [...episodes].sort((a, b) => b.publishedAt - a.publishedAt);
  return feedMode === 'reverse' ? sorted.reverse() : sorted;
}

/**
 * Canonical inbox builder — called by PodcastContext after fresh episode fetches.
 *
 * For 1-in-10 podcasts the back-catalog pool is built from the full raw feed
 * (independent of the backfill setting) so injection at every 10th slot always
 * has candidates even when backfill is 'latest-only'.
 *
 * For all other modes, backfill truncation is applied first, then feedMode ordering.
 */
export function buildFreshInbox(
  entries: Array<{ podcast: Podcast; rawEpisodes: Episode[] }>
): Episode[] {
  const regularGroups: Episode[][] = [];
  const oneInTenPool: Episode[] = [];

  for (const { podcast, rawEpisodes } of entries) {
    const sorted = [...rawEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);

    if (podcast.feedMode === '1-in-10') {
      // Primary stream: most recent episode only
      if (sorted.length > 0) regularGroups.push([sorted[0]]);
      // Back-catalog pool: ALL remaining episodes, shuffled.
      // Intentionally ignores backfill so the pool has real candidates regardless
      // of how many episodes the user configured to "backfill" with.
      if (sorted.length > 1) oneInTenPool.push(...shuffled(sorted.slice(1)));
    } else {
      const limit = getBackfillLimit(podcast);
      const limited = limit === 9999 ? sorted : sorted.slice(0, limit);
      regularGroups.push(applyFeedBehavior(limited, podcast));
    }
  }

  return injectOneInTen(roundRobinMerge(regularGroups), oneInTenPool);
}

/**
 * View builder for the "All" tab from stored inbox episodes.
 * Separates 1-in-10 podcasts into a cycling pool and injects at every 10th slot.
 * Backfill is NOT re-applied here (it was applied at store time).
 */
export function buildInboxView(
  episodes: Episode[],
  subscriptions: Podcast[]
): Episode[] {
  const subMap = new Map(subscriptions.map((p) => [p.id, p]));

  const groups = new Map<string, Episode[]>();
  for (const ep of episodes) {
    if (!groups.has(ep.podcastId)) groups.set(ep.podcastId, []);
    groups.get(ep.podcastId)!.push(ep);
  }

  const regularGroups: Episode[][] = [];
  const oneInTenPool: Episode[] = [];

  for (const [podcastId, eps] of groups) {
    const podcast = subMap.get(podcastId);
    if (!podcast) {
      regularGroups.push(eps);
      continue;
    }

    if (podcast.feedMode === '1-in-10') {
      const sorted = [...eps].sort((a, b) => b.publishedAt - a.publishedAt);
      if (sorted.length > 0) regularGroups.push([sorted[0]]);
      if (sorted.length > 1) oneInTenPool.push(...shuffled(sorted.slice(1)));
    } else {
      regularGroups.push(applyFeedBehavior(eps, podcast));
    }
  }

  return injectOneInTen(roundRobinMerge(regularGroups), oneInTenPool);
}

/**
 * Returns a filtered + ordered episode list.
 * Tag and podcast filters return ALL matching episodes ordered by feedMode
 * (using ordering only — never sampling — so the full episode list is visible).
 */
export function filterInboxView(
  episodes: Episode[],
  subscriptions: Podcast[],
  filter: InboxFilter
): Episode[] {
  if (filter.type === 'all') {
    return buildInboxView(episodes, subscriptions);
  }

  const subMap = new Map(subscriptions.map((p) => [p.id, p]));

  if (filter.type === 'podcast') {
    const matching = episodes.filter((e) => e.podcastId === filter.podcastId);
    const podcast = subMap.get(filter.podcastId);
    return orderForFilter(matching, podcast?.feedMode ?? 'default');
  }

  if (filter.type === 'tag') {
    const taggedIds = new Set(
      subscriptions.filter((p) => p.tags.includes(filter.tag)).map((p) => p.id)
    );
    const matching = episodes.filter((e) => taggedIds.has(e.podcastId));

    // Group by podcast, apply ordering per podcast, then roundRobinMerge
    const groups = new Map<string, Episode[]>();
    for (const ep of matching) {
      if (!groups.has(ep.podcastId)) groups.set(ep.podcastId, []);
      groups.get(ep.podcastId)!.push(ep);
    }
    const ordered: Episode[][] = [];
    for (const [podcastId, eps] of groups) {
      const podcast = subMap.get(podcastId);
      ordered.push(orderForFilter(eps, podcast?.feedMode ?? 'default'));
    }
    return roundRobinMerge(ordered);
  }

  return episodes;
}

export function episodeToPlayerEpisode(ep: Episode): PlayerEpisode {
  return {
    id: ep.id,
    title: ep.title,
    podcastTitle: ep.podcastTitle,
    podcastArtwork: ep.podcastArtwork,
    audioUrl: ep.audioUrl,
    duration: ep.duration,
  };
}
