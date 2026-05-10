import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodeCard } from '@/components/EpisodeCard';
import { usePodcast } from '@/context/PodcastContext';
import { useColors } from '@/hooks/useColors';
import type { Episode } from '@/types/podcast';

export default function InboxScreen() {
  const colors = useColors();
  const { inbox, readIds, loading, refreshing, refreshInbox, markRead } = usePodcast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 34 + 84 : 84;

  const handlePress = useCallback(
    (episode: Episode) => {
      markRead(episode.id);
    },
    [markRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Episode }) => (
      <EpisodeCard
        episode={item}
        isRead={readIds.has(item.id)}
        onPress={() => handlePress(item)}
      />
    ),
    [readIds, handlePress]
  );

  const keyExtractor = useCallback((item: Episode) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb && (
        <View
          style={[
            styles.webHeader,
            { paddingTop: 67, backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inbox</Text>
        </View>
      )}
      <FlatList
        data={inbox}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInbox}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={inbox.length > 0}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Your inbox is empty
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Search for podcasts in Discover and subscribe to start filling your inbox.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  empty: {
    flex: 1,
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
