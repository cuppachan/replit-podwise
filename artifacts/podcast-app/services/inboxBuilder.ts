import type { PlayerEpisode } from '@/context/AudioPlayerContext';
import { applyFeedBehavior } from '@/services/feedBehaviors';
import type { Episode, Podcast } from '@/types/podcast';

export type InboxFilter =
  | { type: 'all' }
  | { type: 'tag'; tag: string }
  | { type: 'podcast'; podcastId: string };

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

function buildGroupedView(
  episodes: Episode[],
  subMap: Map<string, Podcast>
): Episode[] {
  const groups = new Map<string, Episode[]>();
  for (const ep of episodes) {
    if (!groups.has(ep.podcastId)) groups.set(ep.podcastId, []);
    groups.get(ep.podcastId)!.push(ep);
  }
  const shaped: Episode[][] = [];
  for (const [podcastId, eps] of groups) {
    const podcast = subMap.get(podcastId);
    shaped.push(podcast ? applyFeedBehavior(eps, podcast) : eps);
  }
  return roundRobinMerge(shaped);
}

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
    const shaped = applyFeedBehavior(eps, podcast);
    if (podcast.feedMode === '1-in-10' && shaped.length > 1) {
      regularGroups.push([shaped[0]]);
      oneInTenPool.push(...shaped.slice(1));
    } else {
      regularGroups.push(shaped);
    }
  }

  const base = roundRobinMerge(regularGroups);

  if (oneInTenPool.length === 0) return base;

  const result: Episode[] = [];
  let baseIdx = 0;
  let injIdx = 0;

  while (baseIdx < base.length) {
    const nextPos = result.length + 1;
    if (nextPos % 10 === 0 && injIdx < oneInTenPool.length) {
      result.push(oneInTenPool[injIdx++]);
    } else {
      result.push(base[baseIdx++]);
    }
  }
  while (injIdx < oneInTenPool.length) {
    result.push(oneInTenPool[injIdx++]);
  }
  return result;
}

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
    return buildGroupedView(matching, subMap);
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
