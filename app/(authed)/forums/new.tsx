import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useIsServerAdmin } from '../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { slugify } from '../../../lib/forum-utils';
import { FormInput } from '../../../components/FormInput';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { DateTimeInput } from '../../../components/DateTimeInput';
import { UserPicker } from '../../../components/UserPicker';

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewForum() {
  const router = useRouter();
  const { user } = useAuth();
  const admin = useIsServerAdmin();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [closesAt, setClosesAt] = useState<string>(() =>
    toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const minClosesAt = toLocalInputValue(new Date());
  const [moderatorUids, setModeratorUids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!admin) {
    return (
      <View style={styles.deny}>
        <Text style={styles.denyText}>You don't have permission to create forums.</Text>
        <TouchableOpacity onPress={() => router.replace('/forums')}>
          <Text style={styles.denyLink}>← Back to forums</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function onCreate() {
    setError(null);
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    if (!trimmedName) return setError('Forum needs a name.');
    if (!slug) return setError('Name must contain at least one letter or number.');
    if (!closesAt) return setError('Pick a close date and time.');
    const closesAtMs = new Date(closesAt).getTime();
    if (!Number.isFinite(closesAtMs)) return setError('Invalid date/time.');
    if (closesAtMs <= Date.now()) return setError('Close time must be in the future.');

    setBusy(true);
    try {
      const ref = doc(db, 'forums', slug);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setError('A forum with that slug already exists. Pick a different name.');
        setBusy(false);
        return;
      }
      // Always include the creator (an admin) as a moderator.
      const finalMods = Array.from(new Set([...moderatorUids, user!.uid]));
      await setDoc(ref, {
        name: trimmedName,
        slug,
        description: description.trim(),
        closesAt: Timestamp.fromMillis(closesAtMs),
        createdAt: serverTimestamp(),
        createdBy: user!.uid,
        moderatorUids: finalMods,
        postCount: 0,
      });
      router.replace(`/forums/${slug}`);
    } catch (err: unknown) {
      console.error('[forum:new] failed:', err);
      const e = err as { code?: string; message?: string };
      setError(`Could not create forum (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Create a forum</Text>

      <Text style={styles.label}>Name</Text>
      <FormInput placeholder="e.g. Workshop #3 — Intro to Linux" value={name} onChangeText={setName} />
      {!!name.trim() && <Text style={styles.slugHint}>URL: /forums/{slugify(name) || '—'}</Text>}

      <Text style={styles.label}>Description (optional)</Text>
      <FormInput
        placeholder="What this forum is for"
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ height: 80, paddingTop: 14 }}
      />

      <Text style={styles.label}>Close date & time</Text>
      <DateTimeInput value={closesAt} onChange={setClosesAt} min={minClosesAt} />

      <Text style={styles.label}>Moderators for this forum</Text>
      <Text style={styles.subLabel}>
        Selected users can mute, timeout, quarantine and review reports here. You're added as a
        moderator automatically.
      </Text>
      <UserPicker
        selected={moderatorUids}
        onChange={setModeratorUids}
        excludeUids={user ? [user.uid] : []}
        emptyHint="No other users to pick yet."
      />

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={{ marginTop: 16 }}>
        <PrimaryButton label="Create forum" onPress={onCreate} loading={busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 640 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 28, marginBottom: 20 },
  label: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 6, marginTop: 12 },
  subLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  slugHint: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: -8, marginBottom: 8 },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, marginTop: 12 },
  deny: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  denyText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 16, marginBottom: 12 },
  denyLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 14 },
});
