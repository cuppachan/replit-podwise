import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import type { Podcast } from '@/types/podcast';

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptions, unsubscribe, importFromOPML } = usePodcast();
  const [opmlModalVisible, setOpmlModalVisible] = useState(false);
  const [opmlText, setOpmlText] = useState('');
  const [importing, setImporting] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : 0;
  const bottomPad = isWeb ? 34 + 84 : 84;

  const handleUnsubscribe = useCallback(
    (podcast: Podcast) => {
      Alert.alert('Unsubscribe', `Remove "${podcast.title}" from your library?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await unsubscribe(podcast.id);
          },
        },
      ]);
    },
    [unsubscribe]
  );

  const handleImportOPML = useCallback(async () => {
    if (!opmlText.trim()) return;
    setImporting(true);
    try {
      const { added, errors } = await importFromOPML(opmlText);
      setOpmlModalVisible(false);
      setOpmlText('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Import Complete',
        errors > 0
          ? `Added ${added} podcast${added !== 1 ? 's' : ''}. ${errors} failed.`
          : `Added ${added} podcast${added !== 1 ? 's' : ''} successfully.`
      );
    } finally {
      setImporting(false);
    }
  }, [opmlText, importFromOPML]);

  const renderItem = useCallback(
    ({ item }: { item: Podcast }) => (
      <Pressable
        style={({ pressed }) => [
          styles.podcastRow,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: '/podcast/[id]',
            params: {
              id: item.id,
              title: item.title,
              author: item.author,
              artwork: item.artwork,
              feedUrl: item.feedUrl,
              genre: item.genre ?? '',
            },
          })
        }
      >
        <Image
          source={{ uri: item.artwork }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowAuthor, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
        <Pressable
          onPress={() => handleUnsubscribe(item)}
          hitSlop={8}
          testID="unsubscribe-button"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
        </Pressable>
      </Pressable>
    ),
    [colors, handleUnsubscribe]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? topPad : insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Library</Text>
        <Pressable
          style={[styles.importBtn, { backgroundColor: colors.primary }]}
          onPress={() => setOpmlModalVisible(true)}
          testID="import-opml-button"
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={styles.importBtnText}>Import OPML</Text>
        </Pressable>
      </View>

      <FlatList
        data={subscriptions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        scrollEnabled={!!subscriptions.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No subscriptions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Discover podcasts or import your existing subscriptions using an OPML file.
            </Text>
          </View>
        }
      />

      <Modal
        visible={opmlModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpmlModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setOpmlModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Import OPML</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              Paste your OPML file contents below. You can export OPML from AntennaPod or any other podcast app.
            </Text>
            <TextInput
              style={[
                styles.opmlInput,
                {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              multiline
              numberOfLines={12}
              placeholder={'<?xml version="1.0"?>\n<opml version="1.0">...</opml>'}
              placeholderTextColor={colors.mutedForeground}
              value={opmlText}
              onChangeText={setOpmlText}
              autoCorrect={false}
              autoCapitalize="none"
              testID="opml-input"
            />
            <Pressable
              style={[
                styles.importActionBtn,
                { backgroundColor: opmlText.trim() ? colors.primary : colors.muted, borderRadius: colors.radius },
              ]}
              onPress={handleImportOPML}
              disabled={importing || !opmlText.trim()}
              testID="confirm-import-button"
            >
              {importing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.importActionText, { color: opmlText.trim() ? '#fff' : colors.mutedForeground }]}>
                  Import Subscriptions
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  importBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  podcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  artwork: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowAuthor: { fontSize: 13, fontFamily: 'Inter_400Regular' },
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
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  modalBody: { padding: 20 },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
    marginBottom: 16,
  },
  opmlInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  importActionBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  importActionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
