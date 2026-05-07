import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, doc, getDoc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { slugify } from '../lib/forum-utils';
import { logActivity, trackParticipant } from '../lib/moderation';
import { violatesContentFilter } from '../lib/admin-tools';
import { FormInput } from './FormInput';
import { XIcon } from './Icons';

export function PostComposer({
  forumSlug,
  onPosted,
  onCancel,
}: {
  forumSlug: string;
  onPosted?: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const profile = useUserProfile();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const t = title.trim();
    const b = body.trim();
    if (!t) return setError('Add a title.');
    if (!b) return setError('Add some text.');
    if (!user || !profile) return setError('You must be signed in.');
    const blocked = violatesContentFilter(t) ?? violatesContentFilter(b);
    if (blocked) {
      return setError(`Your post contains a restricted word ("${blocked}"). Please rewrite.`);
    }

    setBusy(true);
    try {
      const baseSlug = slugify(t) || 'post';
      const finalSlug = await uniquePostSlug(forumSlug, baseSlug);

      const postsRef = collection(db, 'forums', forumSlug, 'posts');
      const newPostRef = doc(postsRef, finalSlug);
      const forumRef = doc(db, 'forums', forumSlug);

      await runTransaction(db, async (tx) => {
        tx.set(newPostRef, {
          title: t,
          slug: finalSlug,
          body: b,
          authorUid: user.uid,
          authorUsername: profile.username,
          authorDisplayName: profile.displayName,
          createdAt: serverTimestamp(),
          likeCount: 0,
          commentCount: 0,
          nonAuthorCommentCount: 0,
          reportCount: 0,
          isQuarantined: false,
          isDeleted: false,
        });
        tx.update(forumRef, { postCount: increment(1) });
      });

      trackParticipant(forumSlug, user.uid, profile.username, profile.displayName, 'post');
      logActivity(forumSlug, user.uid, profile.username, 'post_created', {
        targetType: 'post',
        targetId: finalSlug,
        details: t,
      });

      setTitle('');
      setBody('');
      onPosted?.();
    } catch (err: unknown) {
      console.error('[post:create] failed:', err);
      const e = err as { code?: string; message?: string };
      setError(`Could not post (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.box}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>New post</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <XIcon size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <FormInput placeholder="Title" value={title} onChangeText={setTitle} />
      <FormInput
        placeholder="Write something…"
        value={body}
        onChangeText={setBody}
        multiline
        style={{ height: 140, paddingTop: 14 }}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <View />

        <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitLabel}>Post</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

async function uniquePostSlug(forumSlug: string, base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const ref = doc(db, 'forums', forumSlug, 'posts', candidate);
    const snap = await getDoc(ref);
    if (!snap.exists()) return candidate;
  }
  return `${base}-${Date.now()}`;
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#2a2a2a', padding: 22, borderRadius: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18 },
  closeBtn: { padding: 4 },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  submit: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 88,
    alignItems: 'center',
  },
  submitLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 14 },
});
