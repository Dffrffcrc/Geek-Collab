import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { addDoc, collection, doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { REPORT_REASONS, type ReportReason, type ReportTargetType, logActivity } from '../lib/moderation';
import { FormInput } from './FormInput';
import { XIcon } from './Icons';

export function ReportModal({
  visible,
  onClose,
  forumSlug,
  targetType,
  targetId,
  parentPostSlug,
  targetAuthorUid,
  targetAuthorUsername,
}: {
  visible: boolean;
  onClose: () => void;
  forumSlug: string;
  targetType: ReportTargetType;
  targetId: string;
  parentPostSlug?: string;
  targetAuthorUid: string;
  targetAuthorUsername: string;
}) {
  const { user } = useAuth();
  const profile = useUserProfile();
  const [reason, setReason] = useState<ReportReason>('Spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setReason('Spam');
    setDetails('');
    setBusy(false);
    setError(null);
    setDone(false);
  }

  async function onSubmit() {
    setError(null);
    if (!user || !profile) return setError('You must be signed in.');

    setBusy(true);
    try {
      await addDoc(collection(db, 'forums', forumSlug, 'reports'), {
        targetType,
        targetId,
        parentPostSlug: parentPostSlug ?? null,
        targetAuthorUid,
        targetAuthorUsername,
        reason,
        details: details.trim(),
        reporterUid: user.uid,
        reporterUsername: profile.username,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      // Bump reportCount on the post (only when reporting a post — comments
      // don't have their own counter; their reports show up in the panel anyway).
      if (targetType === 'post') {
        try {
          await runTransaction(db, async (tx) => {
            tx.update(doc(db, 'forums', forumSlug, 'posts', targetId), {
              reportCount: increment(1),
            });
          });
        } catch {
          // Non-critical — report still recorded.
        }
      }
      logActivity(forumSlug, user.uid, profile.username, 'report_filed', {
        targetType,
        targetId,
        details: reason,
      });
      setDone(true);
    } catch (err: unknown) {
      console.error('[report] failed:', err);
      const e = err as { code?: string; message?: string };
      setError(`Could not submit report (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        reset();
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.heading}>Report {targetType === 'post' ? 'post' : 'comment'}</Text>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.close}
            >
              <XIcon size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {done ? (
            <View>
              <Text style={styles.body}>Thanks. Moderators will review this.</Text>
              <TouchableOpacity
                style={styles.submit}
                onPress={() => {
                  reset();
                  onClose();
                }}
              >
                <Text style={styles.submitLabel}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Reason</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {REPORT_REASONS.map((r) => {
                  const active = r === reason;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setReason(r)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Details</Text>
              <FormInput
                placeholder="Optional. Give moderators more context."
                value={details}
                onChangeText={setDetails}
                multiline
                style={{ height: 110, paddingTop: 14 }}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={busy}>
                {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitLabel}>Submit</Text>}
              </TouchableOpacity>
            </>
          )}
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
    maxWidth: 540,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18 },
  close: { padding: 4 },
  body: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  label: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 8, marginTop: 4 },
  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 6 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#1f1f1f',
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, marginTop: 6 },
  submit: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 18,
    marginTop: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  submitLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 14 },
});
