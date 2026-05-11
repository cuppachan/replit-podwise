import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

const RATES = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

function secsToDisplay(secs: number): string {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

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

  const { episode, isPlaying, isLoading, position, duration, rate, play, togglePlayPause, seekTo, setRate } =
    useAudioPlayer();

  const isThisEpisode = episode?.id === params.id;
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

  const handlePlay = () => {
    if (isThisEpisode) {
      togglePlayPause();
    } else if (params.audioUrl) {
      play({
        id: params.id,
        title: params.title ?? '',
        podcastTitle: params.podcastTitle ?? '',
        podcastArtwork: params.podcastArtwork ?? '',
        audioUrl: params.audioUrl,
        duration: params.duration ?? '',
      });
    }
  };

  const activePos = isThisEpisode ? position : 0;
  const activeDur = isThisEpisode ? duration : 0;
  const progress = activeDur > 0 ? activePos / activeDur : 0;
  const showLoading = isThisEpisode && isLoading;
  const showPlaying = isThisEpisode && isPlaying;

  const nextRate = () => {
    const idx = RATES.indexOf(rate);
    const next = RATES[(idx + 1) % RATES.length];
    setRate(next);
  };

  const skip = (deltaSecs: number) => {
    seekTo(Math.max(0, Math.min(activePos + deltaSecs, activeDur)));
  };

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

        {params.audioUrl ? (
          <View style={styles.playerSection}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${progress * 100}%` },
                ]}
              />
            </View>

            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                {secsToDisplay(activePos)}
              </Text>
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                -{secsToDisplay(Math.max(0, activeDur - activePos))}
              </Text>
            </View>

            <View style={styles.controls}>
              <Pressable onPress={() => skip(-15)} hitSlop={8} style={styles.skipBtn}>
                <Ionicons name="play-back" size={26} color={colors.foreground} />
                <Text style={[styles.skipLabel, { color: colors.mutedForeground }]}>15</Text>
              </Pressable>

              <Pressable
                style={[styles.playBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handlePlay}
                testID="play-button"
              >
                {showLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name={showPlaying ? 'pause' : 'play'} size={28} color="#fff" />
                )}
              </Pressable>

              <Pressable onPress={() => skip(30)} hitSlop={8} style={styles.skipBtn}>
                <Ionicons name="play-forward" size={26} color={colors.foreground} />
                <Text style={[styles.skipLabel, { color: colors.mutedForeground }]}>30</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={nextRate}
              style={[styles.rateBtn, { borderColor: colors.border, borderRadius: colors.radius / 2 }]}
              hitSlop={8}
            >
              <Text style={[styles.rateText, { color: colors.mutedForeground }]}>
                {rate === 1 ? '1×' : `${rate}×`}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.noAudio, { borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.noAudioText, { color: colors.mutedForeground }]}>
              No audio available for this episode
            </Text>
          </View>
        )}

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
    paddingBottom: 80,
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
    marginBottom: 32,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  playerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginVertical: 8,
  },
  skipBtn: {
    alignItems: 'center',
    gap: 2,
  },
  skipLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  playBtn: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtn: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rateText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  noAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  noAudioText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
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
