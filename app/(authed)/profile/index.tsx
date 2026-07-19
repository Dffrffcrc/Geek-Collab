import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { FormInput } from '../../../components/FormInput';
import { UserRoleTags } from '../../../components/RoleTag';
import { timeAgo } from '../../../lib/forum-utils';
import { describeActionError } from '../../../lib/admin-tools';
import { useRouter } from 'expo-router';

type AuthoredPost = {
  forumSlug: string;
  postSlug: string;
  title: string;
  createdAt: Timestamp;
};

const MAX_DISPLAY_NAME = 40;

export default function MyProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const { user } = useAuth();
  const profile = useUserProfile();
  const [posts, setPosts] = useState<AuthoredPost[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function beginEdit() {
    setDraftName(profile?.displayName ?? '');
    setNameError(null);
    setEditing(true);
  }

  async function saveName() {
    if (!user) return;
    const next = draftName.trim();
    if (!next) {
      setNameError('Display name cannot be empty.');
      return;
    }
    if (next.length > MAX_DISPLAY_NAME) {
      setNameError(`Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`);
      return;
    }
    if (next === profile?.displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setNameError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName: next });
      setEditing(false);
    } catch (err) {
      console.error('[profile:save-name] failed:', err);
      setNameError(describeActionError('update display name', err));
    } finally {
      setSaving(false);
    }
  }

  // Load posts authored by the user across all forums (collection group query).
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const forumsSnap = await getDocs(collection(db, 'forums'));
        const postLists = await Promise.all(
          forumsSnap.docs.map(async (forumDoc) => {
            const postsSnap = await getDocs(
              query(
                collection(db, 'forums', forumDoc.id, 'posts'),
                where('authorUid', '==', user.uid),
                orderBy('createdAt', 'desc'),
              ),
            );
            return postsSnap.docs
              // Hide soft-deleted posts. Not filtered in the query itself
              // because Firestore inequalities+ordering interact awkwardly;
              // client-side is cleaner and the cost is negligible.
              .filter((d) => d.data().isDeleted !== true)
              .map((d) => {
                const data = d.data();
                return {
                  forumSlug: forumDoc.id,
                  postSlug: d.id,
                  title: data.title,
                  createdAt: data.createdAt,
                } as AuthoredPost;
              });
          }),
        );
        const items = postLists
          .flat()
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setPosts(items);
      } catch (err) {
        console.warn('[profile:posts] failed:', err);
        setPosts([]);
      }
    })();
  }, [user]);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Avatar size={88} label={profile?.displayName ?? profile?.username} />
        <View style={{ marginLeft: compact ? 0 : 18, marginTop: compact ? 14 : 0, flex: 1 }}>
          {editing ? (
            <View style={styles.editRow}>
              <FormInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Display name"
                autoFocus
                maxLength={MAX_DISPLAY_NAME}
              />
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}
                  onPress={saveName}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryLabel}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setEditing(false)}
                  disabled={saving}
                >
                  <Text style={styles.btnGhostLabel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.nameRow}>
                <Text style={[styles.name, compact && styles.nameCompact]}>{profile?.displayName ?? '...'}</Text>
                <UserRoleTags username={profile?.username} />
                <TouchableOpacity onPress={beginEdit} style={styles.editLinkWrap}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.username}>@{profile?.username ?? '...'}</Text>
              <Text style={styles.email}>{profile?.email ?? ''}</Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.sectionHeader}>Your posts</Text>
      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>You haven't posted anything yet.</Text>
      ) : (
        posts.map((p) => (
          <View key={`${p.forumSlug}/${p.postSlug}`} style={styles.postRow}>
            <Text style={styles.postTitle} onPress={() => router.push(`/forums/${p.forumSlug}/${p.postSlug}`)}>
              {p.title}
            </Text>
            <Text style={styles.postMeta}>
              in {p.forumSlug} · {timeAgo(p.createdAt)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 720 },
  scrollCompact: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  nameCompact: { fontSize: 22 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  email: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  postRow: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 10 },
  postTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 16 },
  postMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  editLinkWrap: { marginLeft: 8 },
  editLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12, textDecorationLine: 'underline' },
  editRow: { marginRight: 16 },
  errorText: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  editButtons: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', minWidth: 80 },
  btnPrimary: { backgroundColor: COLORS.yellow },
  btnPrimaryLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  btnGhost: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: COLORS.border },
  btnGhostLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
});
