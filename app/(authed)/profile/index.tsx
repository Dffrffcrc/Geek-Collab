import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  collectionGroup,
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
        const q = query(
          collectionGroup(db, 'posts'),
          where('authorUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        const items: AuthoredPost[] = snap.docs.map((d) => {
          const data = d.data();
          // path: forums/{forumSlug}/posts/{postSlug}
          const segments = d.ref.path.split('/');
          return {
            forumSlug: segments[1],
            postSlug: segments[3],
            title: data.title,
            createdAt: data.createdAt,
          };
        });
        setPosts(items);
      } catch (err) {
        // Collection group queries need an index — log so we can build one.
        console.warn('[profile:posts] failed (likely needs Firestore index):', err);
        setPosts([]);
      }
    })();
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Avatar size={88} label={profile?.displayName ?? profile?.username} />
        <View style={{ marginLeft: 18, flex: 1 }}>
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
                <Text style={styles.name}>{profile?.displayName ?? '...'}</Text>
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

      <Text style={styles.todo}>
        Avatar uploads coming soon. Changing your display name only affects new posts and comments —
        existing ones keep the name they were posted under.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 720 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  email: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  postRow: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 10 },
  postTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 16 },
  postMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  todo: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 32, fontStyle: 'italic', lineHeight: 18 },
  editLinkWrap: { marginLeft: 8 },
  editLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12, textDecorationLine: 'underline' },
  editRow: { marginRight: 16 },
  errorText: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  editButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', minWidth: 80 },
  btnPrimary: { backgroundColor: COLORS.yellow },
  btnPrimaryLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  btnGhost: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: COLORS.border },
  btnGhostLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
});
