import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { collection, doc, getDoc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { slugify } from '../lib/forum-utils';
import { uploadPostMedia } from '../lib/upload';
import { logActivity, trackParticipant } from '../lib/moderation';
import { useContentFilter, violatesContentFilter } from '../lib/admin-tools';
import { FormInput } from './FormInput';
import { ImageIcon, XIcon } from './Icons';

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
  const filter = useContentFilter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Revoke object URLs we created when previews change/unmount, to avoid leaks.
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelectFiles(e: { target: { files: FileList | null } }) {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;
    const arr = Array.from(picked);
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    setError(null);
    const t = title.trim();
    const b = body.trim();
    if (!t) return setError('Add a title.');
    if (!b && files.length === 0) return setError('Add some text or an image.');
    if (!user || !profile) return setError('You must be signed in.');
    const blocked =
      violatesContentFilter(t, filter.words) ?? violatesContentFilter(b, filter.words);
    if (blocked) {
      return setError(`Your post contains a restricted word ("${blocked}"). Please rewrite.`);
    }

    setBusy(true);
    try {
      const baseSlug = slugify(t) || 'post';
      const finalSlug = await uniquePostSlug(forumSlug, baseSlug);

      // Upload any attached images first.
      const mediaUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadPostMedia(forumSlug, finalSlug, i, files[i]);
        mediaUrls.push(url);
      }

      const postsRef = collection(db, 'forums', forumSlug, 'posts');
      const newPostRef = doc(postsRef, finalSlug);
      const forumRef = doc(db, 'forums', forumSlug);

      await runTransaction(db, async (tx) => {
        tx.set(newPostRef, {
          title: t,
          slug: finalSlug,
          body: b,
          mediaUrls,
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

      // Clear and notify.
      previews.forEach((u) => URL.revokeObjectURL(u));
      setTitle('');
      setBody('');
      setFiles([]);
      setPreviews([]);
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

      {previews.length > 0 && (
        <View style={styles.previews}>
          {previews.map((src, idx) => (
            <View key={src} style={styles.previewBox}>
              <Image source={{ uri: src }} style={styles.previewImg} resizeMode="cover" />
              <TouchableOpacity
                style={styles.previewRemove}
                onPress={() => removeFile(idx)}
                accessibilityLabel="Remove image"
              >
                <XIcon size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        {/* TODO: re-enable when external media-storage path is wired up.
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => fileInputRef.current?.click()}
          disabled={Platform.OS !== 'web'}
        >
          <ImageIcon size={16} color={COLORS.yellow} />
          <Text style={styles.attachLabel}>Add image</Text>
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          // @ts-expect-error <input> works in react-native-web
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onSelectFiles}
            style={{ display: 'none' }}
          />
        )}
        */}
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
  previews: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  previewBox: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  previewImg: { width: '100%', height: '100%' },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
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
