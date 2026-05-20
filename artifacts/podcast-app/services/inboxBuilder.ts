import type { PlayerEpisode } from '@/context/AudioPlayerContext';
import { applyFeedBehavior } from '@/services/feedBehaviors';
import type { Episode, Podcast } from '@/types/podcast';

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

function injectOneInTen(base: Episode[], pool: Episode[]): Episode[] {
  if (pool.length === 0) return base;
  const result: Episode[] = [];
  let baseIdx = 0;
  while (baseIdx < base.length) {
    const nextPos = result.length + 1;
    if (nextPos % 10 === 0) {
      const poolIdx = (nextPos / 10 - 1) % pool.length;
      result.push(pool[poolIdx]);
    } else {
      result.push(base[baseIdx++]);
    }
  }
  return result;
}

function groupAndShape(
  episodes: Episode[],
  subMap: Map<string, Podcast>,
  applyBackfill: boolean
): { regularGroups: Episode[][]; oneInTenPool: Episode[] } {
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

    const shaped = applyFeedBehavior(eps, podcast);

    let limited = shaped;
    if (applyBackfill) {
      const limit = getBackfillLimit(podcast);
      limited = limit === 9999 ? shaped : shaped.slice(0, limit);
    }

    if (podcast.feedMode === '1-in-10') {
      if (limited.length > 0) regularGroups.push([limited[0]]);
      if (limited.length > 1) oneInTenPool.push(...shuffled(limited.slice(1)));
    } else {
      regularGroups.push(limited);
    }
  }

  return { regularGroups, oneInTenPool };
}

/**
 * Canonical inbox builder called by PodcastContext after fresh episode fetches.
 * Applies backfill limit + feedMode behaviors + 1-in-10 injection.
 */
export function buildFreshInbox(
  entries: Array<{ podcast: Podcast; rawEpisodes: Episode[] }>
): Episode[] {
  const regularGroups: Episode[][] = [];
  const oneInTenPool: Episode[] = [];

  for (const { podcast, rawEpisodes } of entries) {
    const limit = getBackfillLimit(podcast);
    const sorted = [...rawEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);
    const limited = limit === 9999 ? sorted : sorted.slice(0, limit);
    const shaped = applyFeedBehavior(limited, podcast);

    if (podcast.feedMode === '1-in-10') {
      if (shaped.length > 0) regularGroups.push([shaped[0]]);
      if (shaped.length > 1) oneInTenPool.push(...shuffled(shaped.slice(1)));
    } else {
      regularGroups.push(shaped);
    }
  }

  return injectOneInTen(roundRobinMerge(regularGroups), oneInTenPool);
}

/**
 * View builder for "All" inbox tab: applies feedMode + backfill to stored episodes,
 * then injects 1-in-10 back-catalog picks at every 10th slot (cycling through pool).
 */
export function buildInboxView(
  episodes: Episode[],
  subscriptions: Podcast[]
): Episode[] {
  const subMap = new Map(subscriptions.map((p) => [p.id, p]));
  const { regularGroups, oneInTenPool } = groupAndShape(episodes, subMap, true);
  return injectOneInTen(roundRobinMerge(regularGroups), oneInTenPool);
}

/**
 * Filter inbox by tag or podcast. Applies feedMode ordering but NOT backfill truncation
 * so the user sees all matching episodes in the filtered view.
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

  if (filter.type === 'tag') {
    const taggedIds = new Set(
      subscriptions.filter((p) => p.tags.includes(filter.tag)).map((p) => p.id)
    );
    const matching = episodes.filter((e) => taggedIds.has(e.podcastId));
    const { regularGroups } = groupAndShape(matching, subMap, false);
    return roundRobinMerge(regularGroups);
  }

  if (filter.type === 'podcast') {
    const matching = episodes.filter((e) => e.podcastId === filter.podcastId);
    const podcast = subMap.get(filter.podcastId);
    return podcast ? applyFeedBehavior(matching, podcast) : matching;
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
