import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DraggableEpisodeList } from '@/components/DraggableEpisodeList';
import { EpisodeCard } from '@/components/EpisodeCard';
import { FilterBar } from '@/components/FilterBar';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { usePodcast } from '@/context/PodcastContext';
import { useColors } from '@/hooks/useColors';
import {
  episodeToPlayerEpisode,
  filterInboxView,
  type InboxFilter,
} from '@/services/inboxBuilder';
import type { Episode } from '@/types/podcast';

export default function InboxScreen() {
  const colors = useColors();
  const {
    inbox,
    subscriptions,
    readIds,
    lockedIds,
    manualOrder,
    loading,
    refreshing,
    refreshInbox,
    markRead,
    lockEpisode,
    unlockEpisode,
    unlockIfLocked,
    reorderLocked,
    updateManualOrder,
  } = usePodcast();
  const { playQueue, lastFinishedEpisodeId } = useAudioPlayer();
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 34 + 84 : 84;

  const [filter, setFilter] = useState<InboxFilter>({ type: 'all' });

  useEffect(() => {
    if (!lastFinishedEpisodeId) return;
    unlockIfLocked(lastFinishedEpisodeId);
  }, [lastFinishedEpisodeId, unlockIfLocked]);

  const subsWithInbox = useMemo(() => {
    const inboxPodcastIds = new Set(inbox.map((e) => e.podcastId));
    return subscriptions.filter((p) => inboxPodcastIds.has(p.id));
  }, [subscriptions, inbox]);

  const displayEpisodes = useMemo(
    () => filterInboxView(inbox, subscriptions, filter),
    [inbox, subscriptions, filter],
  );

  const inboxById = useMemo(() => new Map(inbox.map((e) => [e.id, e])), [inbox]);

  const lockedEpisodes = useMemo(
    () => lockedIds.filter((id) => inboxById.has(id)).map((id) => inboxById.get(id)!),
    [lockedIds, inboxById],
  );

  const unlockedEpisodes = useMemo(() => {
    const lockedSet = new Set(lockedIds);
    const manualOrderSet = new Set(manualOrder);
    const ordered = manualOrder
      .filter((id) => !lockedSet.has(id) && inboxById.has(id))
      .map((id) => inboxById.get(id)!);
    const algorithmOrdered = displayEpisodes.filter(
      (e) => !lockedSet.has(e.id) && !manualOrderSet.has(e.id),
    );
    return [...algorithmOrdered, ...ordered];
  }, [lockedIds, manualOrder, inboxById, displayEpisodes]);

  const isFiltered = filter.type !== 'all';

  const handlePlayAll = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const playable = displayEpisodes
      .filter((e) => !!e.audioUrl)
      .map(episodeToPlayerEpisode);
    if (playable.length > 0) playQueue(playable);
  }, [displayEpisodes, playQueue]);

  const handlePress = useCallback(
    (episode: Episode) => {
      markRead(episode.id);
    },
    [markRead],
  );

  const handleLockToggle = useCallback(
    (id: string) => {
      if (lockedIds.includes(id)) {
        unlockEpisode(id);
      } else {
        lockEpisode(id);
      }
    },
    [lockedIds, lockEpisode, unlockEpisode],
  );

  const handleUnlockedReorder = useCallback(
    (from: number, to: number) => {
      const ids = unlockedEpisodes.map((e) => e.id);
      const next = [...ids];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      updateManualOrder(next);
    },
    [unlockedEpisodes, updateManualOrder],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const showFilterBar = subsWithInbox.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb && (
        <View
          style={[
            styles.webHeader,
            {
              paddingTop: 67,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inbox</Text>
        </View>
      )}

      {showFilterBar && (
        <FilterBar subscriptions={subsWithInbox} filter={filter} onChange={setFilter} />
      )}

      {isFiltered && displayEpisodes.length > 0 && (
        <Pressable
          style={[
            styles.playAllRow,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
          onPress={handlePlayAll}
          testID="play-all-button"
        >
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={[styles.playAllText, { color: colors.primary }]}>Play All</Text>
          <Text style={[styles.playAllCount, { color: colors.mutedForeground }]}>
            {displayEpisodes.length} episode{displayEpisodes.length !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInbox}
            tintColor={colors.primary}
          />
        }
      >
        {/* All view: locked block + divider + unlocked with drag */}
        {!isFiltered && (
          <>
            {lockedEpisodes.length > 0 && (
              <DraggableEpisodeList
                episodes={lockedEpisodes}
                readIds={readIds}
                lockedSection
                onPress={handlePress}
                onLockToggle={handleLockToggle}
                onReorder={reorderLocked}
              />
            )}

            {lockedEpisodes.length > 0 && (
              <View
                style={[
                  styles.divider,
                  { borderTopColor: colors.primary + '55' },
                ]}
              >
                <View
                  style={[styles.dividerLine, { backgroundColor: colors.primary, opacity: 0.35 }]}
                />
                <View style={[styles.dividerBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed" size={10} color={colors.primary} />
                  <Text style={[styles.dividerLabel, { color: colors.mutedForeground }]}>
                    Locked · {lockedEpisodes.length} episode{lockedEpisodes.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View
                  style={[styles.dividerLine, { backgroundColor: colors.primary, opacity: 0.35 }]}
                />
              </View>
            )}

            <DraggableEpisodeList
              episodes={unlockedEpisodes}
              readIds={readIds}
              lockedSection={false}
              onPress={handlePress}
              onLockToggle={handleLockToggle}
              onReorder={handleUnlockedReorder}
            />

            {inbox.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="mail-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Your inbox is empty
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Search for podcasts in Discover and subscribe to start filling your inbox.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Filtered view: regular list, no lock UI */}
        {isFiltered && (
          <>
            {displayEpisodes.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="filter-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No episodes here
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No episodes match this filter. Try a different one or pull to refresh.
                </Text>
              </View>
            )}
            {displayEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                isRead={readIds.has(episode.id)}
                onPress={() => handlePress(episode)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1 },
  webHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  playAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  playAllText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  playAllCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 'auto',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dividerLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
});
