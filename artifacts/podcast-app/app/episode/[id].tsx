import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function EpisodeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    podcastTitle: string;
    podcastArtwork: string;
    description: string;
    audioUrl: string;
    duration: string;
    publishedAt: string;
    podcastId: string;
  }>();

  const isWeb = Platform.OS === 'web';
  const topInset = isWeb ? 67 : insets.top;

  const publishedDate = params.publishedAt
    ? new Date(Number(params.publishedAt)).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[
          styles.backBtn,
          { top: topInset + 8, borderColor: colors.border, backgroundColor: colors.card },
        ]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: params.podcastArtwork }}
            style={[styles.artwork, { borderRadius: colors.radius * 1.5 }]}
            contentFit="cover"
            transition={200}
          />
        </View>

        <Text style={[styles.podcastName, { color: colors.primary }]} numberOfLines={1}>
          {params.podcastTitle}
        </Text>
        <Text style={[styles.episodeTitle, { color: colors.foreground }]}>
          {params.title}
        </Text>

        <View style={styles.metaRow}>
          {publishedDate ? (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {publishedDate}
            </Text>
          ) : null}
          {params.duration ? (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {params.duration}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => {}}
          testID="play-button"
        >
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.playBtnText}>Play Episode</Text>
        </Pressable>

        {params.description ? (
          <View style={[styles.descriptionBox, { borderTopColor: colors.border }]}>
            <Text style={[styles.descriptionLabel, { color: colors.foreground }]}>
              About this episode
            </Text>
            <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
              {params.description}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  artworkContainer: {
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  artwork: {
    width: 240,
    height: 240,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
  },
  podcastName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    textAlign: 'center',
  },
  episodeTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  descriptionBox: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
    gap: 10,
  },
  descriptionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
