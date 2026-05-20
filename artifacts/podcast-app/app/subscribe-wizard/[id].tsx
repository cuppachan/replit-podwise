import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePodcast } from '@/context/PodcastContext';
import { useColors } from '@/hooks/useColors';
import { withPodcastDefaults } from '@/types/podcast';
import type { BackfillMode, FeedMode, Podcast } from '@/types/podcast';

const PRESET_TAGS = [
  'Tech', 'News', 'True Crime', 'Comedy', 'Education',
  'Science', 'History', 'Business', 'Health', 'Sports',
];

interface WizardOption {
  key: string;
  label: string;
  description: string;
  feedMode: FeedMode;
  backfill: BackfillMode;
  showCountInput?: boolean;
}

const WIZARD_OPTIONS: WizardOption[] = [
  {
    key: 'latest-only',
    label: 'Most recent episode only',
    description: 'Only the newest episode enters your inbox when you subscribe.',
    feedMode: 'default',
    backfill: 'latest-only',
  },
  {
    key: 'last-N',
    label: 'Last N episodes',
    description: 'The most recent N episodes enter your inbox.',
    feedMode: 'default',
    backfill: 'last-N',
    showCountInput: true,
  },
  {
    key: 'all',
    label: 'All episodes',
    description: 'The entire back catalog enters your inbox.',
    feedMode: 'default',
    backfill: 'all',
  },
  {
    key: 'reverse',
    label: 'Oldest first (binge mode)',
    description: 'Play from episode one. Great for narrative series or true crime.',
    feedMode: 'reverse',
    backfill: 'all',
  },
  {
    key: '1-in-10',
    label: '1 in 10 — serendipity',
    description: 'Latest episode plus a random back-catalog pick added to your inbox.',
    feedMode: '1-in-10',
    backfill: 'latest-only',
  },
  {
    key: 'random-pick',
    label: 'Random pick',
    description: 'One randomly selected episode from this podcast.',
    feedMode: 'random-pick',
    backfill: 'latest-only',
  },
];

function optionKeyFromPodcast(p: Podcast): string {
  if (p.feedMode === 'reverse') return 'reverse';
  if (p.feedMode === '1-in-10') return '1-in-10';
  if (p.feedMode === 'random-pick') return 'random-pick';
  if (p.backfill === 'all') return 'all';
  if (p.backfill === 'last-N') return 'last-N';
  return 'latest-only';
}

export default function SubscribeWizardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    author: string;
    artwork: string;
    feedUrl: string;
    genre?: string;
    edit?: string;
  }>();

  const { subscriptions, subscribe, updateSubscription, isSubscribed } = usePodcast();
  const isEdit = params.edit === 'true';
  const alreadySubscribed = isSubscribed(params.id);

  const existingSub = subscriptions.find((p) => p.id === params.id);

  const [selectedKey, setSelectedKey] = useState<string>(() =>
    existingSub ? optionKeyFromPodcast(existingSub) : 'latest-only'
  );
  const [backfillCount, setBackfillCount] = useState<string>(() =>
    String(existingSub?.backfillCount ?? 10)
  );
  const [tags, setTags] = useState<string[]>(() => existingSub?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const tagInputRef = useRef<TextInput>(null);

  const isWeb = Platform.OS === 'web';
  const topInset = isWeb ? 67 : insets.top;

  const selectedOption = WIZARD_OPTIONS.find((o) => o.key === selectedKey) ?? WIZARD_OPTIONS[0];

  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim().replace(/,$/, '').trim();
      if (!trimmed || tags.includes(trimmed)) {
        setTagInput('');
        return;
      }
      setTags((prev) => [...prev, trimmed]);
      setTagInput('');
    },
    [tags]
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const togglePresetTag = useCallback(
    (tag: string) => {
      setTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const count = parseInt(backfillCount, 10);
    const safeCount = Number.isFinite(count) && count > 0 ? count : 10;

    try {
      if (isEdit && alreadySubscribed) {
        await updateSubscription(params.id, {
          tags,
          feedMode: selectedOption.feedMode,
          backfill: selectedOption.backfill,
          backfillCount: selectedOption.showCountInput ? safeCount : undefined,
        });
        router.back();
      } else {
        const podcast = withPodcastDefaults({
          id: params.id,
          title: params.title ?? '',
          author: params.author ?? '',
          description: '',
          artwork: params.artwork ?? '',
          feedUrl: params.feedUrl ?? '',
          genre: params.genre ?? undefined,
          subscribedAt: Date.now(),
          tags,
          feedMode: selectedOption.feedMode,
          backfill: selectedOption.backfill,
          backfillCount: selectedOption.showCountInput ? safeCount : undefined,
        });
        await subscribe(podcast);
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }, [
    saving, isEdit, alreadySubscribed, params, selectedOption,
    backfillCount, tags, subscribe, updateSubscription,
  ]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEdit ? 'Feed Settings' : 'Configure Feed'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.podcastRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Image
            source={{ uri: params.artwork }}
            style={[styles.artwork, { borderRadius: colors.radius - 2 }]}
            contentFit="cover"
          />
          <View style={styles.podcastMeta}>
            <Text style={[styles.podcastTitle, { color: colors.foreground }]} numberOfLines={1}>
              {params.title}
            </Text>
            <Text style={[styles.podcastAuthor, { color: colors.mutedForeground }]} numberOfLines={1}>
              {params.author}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          HOW SHOULD THIS APPEAR IN YOUR INBOX
        </Text>

        <View style={[styles.optionsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {WIZARD_OPTIONS.map((option, index) => {
            const selected = selectedKey === option.key;
            const isLast = index === WIZARD_OPTIONS.length - 1;
            return (
              <React.Fragment key={option.key}>
                <Pressable
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setSelectedKey(option.key)}
                  testID={`feed-option-${option.key}`}
                >
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                      {option.description}
                    </Text>
                    {selected && option.showCountInput && (
                      <View style={styles.countRow}>
                        <Text style={[styles.countLabel, { color: colors.foreground }]}>Episodes:</Text>
                        <TextInput
                          style={[
                            styles.countInput,
                            {
                              backgroundColor: colors.input,
                              color: colors.foreground,
                              borderColor: colors.border,
                              borderRadius: 8,
                            },
                          ]}
                          value={backfillCount}
                          onChangeText={(t) => setBackfillCount(t.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                          maxLength={4}
                          selectTextOnFocus
                          testID="backfill-count-input"
                        />
                      </View>
                    )}
                  </View>
                </Pressable>
                {!isLast && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TAGS</Text>

        <View style={[styles.tagsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.tagsHint, { color: colors.mutedForeground }]}>
            Quick picks
          </Text>
          <View style={styles.presetChips}>
            {PRESET_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.input,
                      borderRadius: 20,
                    },
                  ]}
                  onPress={() => togglePresetTag(tag)}
                  testID={`preset-tag-${tag}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tags.filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
            <View style={styles.customChips}>
              {tags
                .filter((t) => !PRESET_TAGS.includes(t))
                .map((tag) => (
                  <Pressable
                    key={tag}
                    style={[styles.chip, { backgroundColor: colors.primary, borderRadius: 20 }]}
                    onPress={() => removeTag(tag)}
                    testID={`custom-tag-${tag}`}
                  >
                    <Text style={[styles.chipText, { color: colors.primaryForeground }]}>
                      {tag}
                    </Text>
                    <Ionicons name="close" size={12} color={colors.primaryForeground} style={{ marginLeft: 2 }} />
                  </Pressable>
                ))}
            </View>
          )}

          <View style={[styles.tagInputRow, { borderTopColor: colors.border }]}>
            <TextInput
              ref={tagInputRef}
              style={[styles.tagInput, { color: colors.foreground }]}
              placeholder="Add custom tag…"
              placeholderTextColor={colors.mutedForeground}
              value={tagInput}
              onChangeText={(t) => {
                if (t.endsWith(',')) {
                  addTag(t);
                } else {
                  setTagInput(t);
                }
              }}
              onSubmitEditing={() => addTag(tagInput)}
              returnKeyType="done"
              blurOnSubmit={false}
              autoCorrect={false}
              autoCapitalize="words"
              testID="tag-input"
            />
            {tagInput.trim().length > 0 && (
              <Pressable
                onPress={() => addTag(tagInput)}
                style={[styles.tagAddBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}
                hitSlop={8}
              >
                <Text style={[styles.tagAddText, { color: colors.primaryForeground }]}>Add</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              backgroundColor: saving ? colors.muted : colors.primary,
              borderRadius: colors.radius,
              opacity: pressed || saving ? 0.8 : 1,
            },
          ]}
          onPress={handleConfirm}
          disabled={saving}
          testID="wizard-confirm-button"
        >
          <Text style={[styles.confirmText, { color: saving ? colors.mutedForeground : colors.primaryForeground }]}>
            {saving ? 'Saving…' : isEdit ? 'Save Settings' : 'Subscribe'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 60 },
  headerBtnText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  podcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  artwork: { width: 52, height: 52 },
  podcastMeta: { flex: 1, gap: 3 },
  podcastTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  podcastAuthor: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 4,
  },
  optionsCard: { overflow: 'hidden' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  optionDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  countLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  countInput: {
    width: 72,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    borderWidth: 1,
    textAlign: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  tagsCard: { padding: 14, gap: 10 },
  tagsHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  presetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 4,
  },
  tagAddBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  tagAddText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  confirmBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
