import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuth } from '../../../../../lib/auth';
import { useUserProfile } from '../../../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';
import { previewText, timeAgo } from '../../../../../lib/forum-utils';
import {
  logActivity,
  muteUser,
  setPostQuarantine,
  timeoutUser,
} from '../../../../../lib/moderation';
import { FormInput } from '../../../../../components/FormInput';
import { isAdminUsername } from '../../../../../lib/admins';

type QPost = {
  id: string;
  title: string;
  body: string;
  authorUid: string;
  authorUsername: string;
  isQuarantined?: boolean;
  createdAt: Timestamp;
};

export default function QuarantineTab() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [posts, setPosts] = useState<QPost[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, 'forums', slug, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<QPost, 'id'>) }))
          .filter((p) => p.isQuarantined === true),
      );
    });
  }, [slug]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.authorUsername.toLowerCase().includes(q),
    );
  }, [posts, search]);

  async function unquarantine(postSlug: string) {
    if (!user || !profile) return;
    try {
      await setPostQuarantine(slug!, postSlug, false);
      logActivity(slug!, user.uid, profile.username, 'post_unquarantined', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      console.error('[mod:unquarantine] failed:', err);
    }
  }

  async function deletePost(postSlug: string) {
    if (!confirm('Delete this post?')) return;
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'forums', slug!, 'posts', postSlug), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      logActivity(slug!, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      console.error('[mod:delete-post] failed:', err);
    }
  }

  async function muteAuthor(targetUid: string, username: string) {
    if (!user) return;
    if (!confirm(`Mute @${username} in this forum?`)) return;
    try {
      await muteUser(slug!, targetUid, user.uid);
      if (profile) {
        logActivity(slug!, user.uid, profile.username, 'user_muted', {
          targetType: 'user',
          targetId: targetUid,
          details: username,
        });
      }
    } catch (err) {
      console.error('[mod:mute] failed:', err);
    }
  }

  async function timeoutAuthor(targetUid: string, username: string) {
    if (!user || !profile) return;
    if (!confirm(`Timeout @${username} globally?`)) return;
    try {
      await timeoutUser(targetUid, user.uid, profile.username);
      logActivity(slug!, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: targetUid,
        details: username,
      });
    } catch (err) {
      console.error('[mod:timeout] failed:', err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Quarantine</Text>
      <Text style={styles.sub}>
        Posts here are hidden from non-moderators. Mods can still see and act on them.
      </Text>

      <FormInput placeholder="Search title / body / author…" value={search} onChangeText={setSearch} />

      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Nothing in quarantine.</Text>
      ) : (
        filtered.map((p) => {
          const adminAuthor = isAdminUsername(p.authorUsername);
          return (
          <View key={p.id} style={styles.card}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardMeta}>
              by{' '}
              <Text style={styles.username} onPress={() => router.push(`/profile/${p.authorUsername}`)}>
                @{p.authorUsername}
              </Text>{' '}
              · {timeAgo(p.createdAt as Timestamp)}
            </Text>
            {!!p.body && <Text style={styles.cardBody}>{previewText(p.body, 220)}</Text>}

            <View style={styles.actions}>
              <ActBtn label="View" onPress={() => router.push(`/forums/${slug}/${p.id}` as never)} />
              {/* Mods can't mute/timeout/delete an admin's content. */}
              {!adminAuthor && (
                <>
                  <ActBtn label="Remove from quarantine" onPress={() => unquarantine(p.id)} />
                  <ActBtn label="Delete" destructive onPress={() => deletePost(p.id)} />
                  <ActBtn label="Mute author" onPress={() => muteAuthor(p.authorUid, p.authorUsername)} />
                  <ActBtn label="Timeout author" destructive onPress={() => timeoutAuthor(p.authorUid, p.authorUsername)} />
                </>
              )}
            </View>
          </View>
          );
        })
      )}
    </ScrollView>
  );
}

function ActBtn({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actBtn, destructive && styles.actBtnDestructive]}
    >
      <Text style={[styles.actBtnLabel, destructive && styles.actBtnLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#7a4a4a' },
  cardTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 4 },
  cardMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 8 },
  username: { color: COLORS.yellow, fontWeight: '700' },
  cardBody: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },
});
