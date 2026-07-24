import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { useIsServerAdmin } from '../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { RoleTag, useUserRole } from '../../../components/RoleTag';
import { MoreIcon } from '../../../components/Icons';
import { OverflowMenu, type MenuAction } from '../../../components/OverflowMenu';
import { PostCard, type PostSummary } from '../../../components/PostCard';

type Profile = {
  uid: string;
  username: string;
  displayName: string;
  bio?: string;
  photoURL?: string | null;
};

type AuthoredPost = PostSummary & { forumSlug: string; createdAt: Timestamp };

export default function PublicProfile() {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useAuth();
  const me = useUserProfile();
  const isAdmin = useIsServerAdmin();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const viewedRole = useUserRole(profile?.username);
  const [posts, setPosts] = useState<AuthoredPost[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const isSelf = !!me && me.username === username;

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      // Username -> uid via the public usernames index.
      const lookup = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      if (!lookup.exists()) {
        if (!cancelled) setProfile(null);
        return;
      }
      const uid = lookup.data().uid as string;
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) {
        if (!cancelled) setProfile(null);
        return;
      }
      const data = userSnap.data();
      if (cancelled) return;
      setProfile({
        uid,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        photoURL: data.photoURL,
      });

      try {
        const forumsSnap = await getDocs(collection(db, 'forums'));
        const postLists = await Promise.all(
          forumsSnap.docs.map(async (forumDoc) => {
            const postsSnap = await getDocs(
              query(
                collection(db, 'forums', forumDoc.id, 'posts'),
                where('authorUid', '==', uid),
                orderBy('createdAt', 'desc'),
              ),
            );
            return postsSnap.docs
              .filter((d) => {
                const dd = d.data();
                if (dd.isDeleted === true) return false;
                // Quarantined posts are for admin-only visibility; hide
                // them from every other viewer including the author's own
                // profile.
                if (dd.isQuarantined === true && !isAdmin) return false;
                return true;
              })
              .map((d) => {
                const dd = d.data() as Omit<AuthoredPost, 'id' | 'forumSlug'>;
                return { ...dd, id: d.id, forumSlug: forumDoc.id } as AuthoredPost;
              });
          }),
        );
        if (cancelled) return;
        setPosts(
          postLists
            .flat()
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
        );
      } catch (err) {
        console.warn('[profile:public:posts] failed:', err);
        if (!cancelled) setPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, isAdmin]);

  async function reportUser() {
    if (!user || !me || !profile) return;
    const reason = prompt(
      `Report @${profile.username}? Briefly say why (harassment, spam, impersonation, etc.):`,
    );
    if (!reason || !reason.trim()) return;
    setReportBusy(true);
    try {
      // Global userReports collection — an admin-only audit trail. Rules
      // allow any signed-in user to create (with their own reporterUid),
      // and admins to read/resolve.
      await addDoc(collection(db, 'userReports'), {
        reportedUid: profile.uid,
        reportedUsername: profile.username,
        reporterUid: user.uid,
        reporterUsername: me.username,
        reason: reason.trim().slice(0, 500),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setReportSent(true);
    } catch (err) {
      console.error('[profile:report] failed:', err);
      alert('Could not submit the report. Try again in a moment.');
    } finally {
      setReportBusy(false);
    }
  }

  const actions: MenuAction[] = [];
  if (!isSelf && user) {
    actions.push({
      label: reportBusy ? 'Reporting…' : reportSent ? 'Reported ✓' : 'Report user',
      onPress: reportUser,
      destructive: true,
    });
  }

  if (profile === undefined) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />;
  }
  if (profile === null) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>User @{username} not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Avatar size={compact ? 72 : 96} label={profile.displayName} photoURL={profile.photoURL} />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                compact && styles.nameCompact,
                viewedRole.nameColor ? { color: viewedRole.nameColor } : null,
              ]}
            >
              {profile.displayName}
            </Text>
          </View>
          <Text style={styles.username}>
            @{profile.username}
            {viewedRole.isAdmin && <RoleTag role="ADMIN" />}
            {viewedRole.isMod && <RoleTag role="MOD" />}
          </Text>
        </View>
        {actions.length > 0 && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Profile actions"
          >
            <MoreIcon size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {profile.bio ? (
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>Posts</Text>
      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>No posts yet.</Text>
      ) : (
        posts.map((p) => (
          <PostCard key={`${p.forumSlug}/${p.id}`} forumSlug={p.forumSlug} post={p} />
        ))
      )}

      <OverflowMenu visible={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  scrollCompact: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, marginBottom: 20 },
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  identity: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  nameCompact: { fontSize: 22 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  moreBtn: { padding: 6, marginTop: 2 },
  bioBox: {
    marginBottom: 24,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.bgPanel,
  },
  bioText: {
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  notFound: { padding: 32 },
  notFoundText: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 14 },
});
