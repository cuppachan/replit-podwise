import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePodcast } from '@/context/PodcastContext';
import type { ItunesResult } from '@/services/itunesApi';
import { itunesResultToPodcast } from '@/services/itunesApi';

interface Props {
  result: ItunesResult;
  showSubscribeButton?: boolean;
}

export function PodcastCard({ result, showSubscribeButton = true }: Props) {
  const colors = useColors();
  const { isSubscribed, subscribe, unsubscribe } = usePodcast();

  const podcastId = `itunes_${result.collectionId}`;
  const subscribed = isSubscribed(podcastId);

  const handleSubscribe = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (subscribed) {
      await unsubscribe(podcastId);
    } else {
      const podcast = itunesResultToPodcast(result);
      await subscribe(podcast);
    }
  }, [subscribed, podcastId, result, subscribe, unsubscribe]);

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/podcast/[id]',
      params: {
        id: podcastId,
        title: result.collectionName,
        author: result.artistName,
        artwork: result.artworkUrl600 ?? result.artworkUrl100 ?? '',
        feedUrl: result.feedUrl,
        genre: result.primaryGenreName ?? '',
      },
    });
  }, [podcastId, result]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={handlePress}
      testID="podcast-card"
    >
      <Image
        source={{ uri: result.artworkUrl600 ?? result.artworkUrl100 }}
        style={styles.artwork}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {result.collectionName}
        </Text>
        <Text style={[styles.author, { color: colors.mutedForeground }]} numberOfLines={1}>
          {result.artistName}
        </Text>
        {result.primaryGenreName ? (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {result.primaryGenreName}
            </Text>
          </View>
        ) : null}
      </View>
      {showSubscribeButton && (
        <Pressable
          onPress={handleSubscribe}
          style={[
            styles.subscribeBtn,
            { backgroundColor: subscribed ? colors.secondary : colors.primary },
          ]}
          hitSlop={8}
          testID="subscribe-button"
        >
          <Ionicons
            name={subscribed ? 'checkmark' : 'add'}
            size={18}
            color={subscribed ? colors.mutedForeground : colors.primaryForeground}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  artwork: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  author: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  subscribeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
