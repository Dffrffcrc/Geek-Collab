import { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { logActivity } from '../lib/moderation';
import { FormInput } from './FormInput';
import { XIcon } from './Icons';

type Common = {
  visible: boolean;
  onClose: () => void;
  forumSlug: string;
  initialBody: string;
};

type EditPost = Common & {
  kind: 'post';
  postSlug: string;
  initialTitle: string;
};

type EditComment = Common & {
  kind: 'comment';
  postSlug: string;
  commentId: string;
};

export function EditModal(props: EditPost | EditComment) {
  const { user } = useAuth();
  const profile = useUserProfile();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!props.visible) return;
    setError(null);
    setBody(props.initialBody);
    if (props.kind === 'post') setTitle(props.initialTitle);
  }, [props.visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSave() {
    setError(null);
    if (!user || !profile) return setError('You must be signed in.');
    if (props.kind === 'post' && !title.trim()) return setError('Title is required.');
    if (!body.trim()) return setError('Body cannot be empty.');

    setBusy(true);
    try {
      if (props.kind === 'post') {
        await updateDoc(doc(db, 'forums', props.forumSlug, 'posts', props.postSlug), {
          title: title.trim(),
          body: body.trim(),
          editedAt: serverTimestamp(),
        });
        logActivity(props.forumSlug, user.uid, profile.username, 'post_edited', {
          targetType: 'post',
          targetId: props.postSlug,
        });
      } else {
        await updateDoc(
          doc(db, 'forums', props.forumSlug, 'posts', props.postSlug, 'comments', props.commentId),
          {
            body: body.trim(),
            editedAt: serverTimestamp(),
          },
        );
        logActivity(props.forumSlug, user.uid, profile.username, 'comment_edited', {
          targetType: 'comment',
          targetId: props.commentId,
        });
      }
      props.onClose();
    } catch (err: unknown) {
      console.error('[edit] failed:', err);
      const e = err as { code?: string; message?: string };
      setError(`Could not save (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={props.visible} animationType="fade" transparent onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              Edit {props.kind === 'post' ? 'post' : 'comment'}
            </Text>
            <TouchableOpacity onPress={props.onClose} style={styles.close}>
              <XIcon size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {props.kind === 'post' && (
            <>
              <Text style={styles.label}>Title</Text>
              <FormInput value={title} onChangeText={setTitle} placeholder="Title" />
            </>
          )}

          <Text style={styles.label}>Body</Text>
          <FormInput
            value={body}
            onChangeText={setBody}
            placeholder="Body"
            multiline
            style={{ height: 160, paddingTop: 14 }}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity onPress={props.onClose} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submit} onPress={onSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitLabel}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    padding: 22,
    width: '100%',
    maxWidth: 600,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18 },
  close: { padding: 4 },
  label: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 6, marginTop: 6 },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancel: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14 },
  submit: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 100,
    alignItems: 'center',
  },
  submitLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 14 },
});
