 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import uuid from 'react-native-uuid';
import { getFirestoreDb, isFirebaseConfigured } from './FirebaseClient';

// --- Password hashing --------------------------------------------------------
// Passwords are hashed client-side with a per-user random salt before they are
// ever persisted (Firestore or AsyncStorage), so a leak of the world-readable
// `users` collection no longer discloses reusable plaintext credentials.
//
// We prefer PBKDF2-HMAC-SHA256 (a slow, salted KDF) via Web Crypto, which is
// available on the web deployment target (react-native-web / Firebase Hosting)
// and Node. A high iteration count makes offline brute force of any leaked
// hash far more expensive than a single SHA-256 round. Where Web Crypto is
// unavailable (some bare native runtimes), we fall back to a single SHA-256
// round via expo-crypto; that fallback is weak against offline brute force and
// is tracked as a deferred follow-up.
//
// Hashes are self-describing — "pbkdf2$<iterations>$<hex>" or "sha256$<hex>" —
// so verifyPassword() always re-derives with the same algorithm and parameters
// the stored hash was created with (handles mixed runtimes + the fallback).
//
// This remains a mitigation, NOT real authentication: verifying a password
// against a world-readable document is fundamentally client-side. Real auth
// (server-verified identity + rate limiting) is DEFERRED — there is no server
// identity in this app.
export const generateSalt = () => String(uuid.v4());

const PBKDF2_ITERATIONS = 150000;

const getSubtle = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle
    ? globalThis.crypto.subtle
    : null;

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const pbkdf2Hex = async (subtle, password, salt, iterations) => {
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return toHex(bits);
};

const sha256Hex = (password, salt) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${password}`);

export const hashPassword = async (password, salt) => {
  const subtle = getSubtle();
  if (subtle) {
    const hex = await pbkdf2Hex(subtle, password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${hex}`;
  }
  const hex = await sha256Hex(password, salt);
  return `sha256$${hex}`;
};

// Re-derive using the algorithm + parameters encoded in the stored hash.
export const verifyPassword = async (password, salt, storedHash) => {
  if (typeof storedHash !== 'string' || !storedHash) return false;
  const parts = storedHash.split('$');

  if (parts[0] === 'pbkdf2' && parts.length === 3) {
    const subtle = getSubtle();
    if (!subtle) return false; // cannot verify a PBKDF2 hash without Web Crypto
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    return (await pbkdf2Hex(subtle, password, salt, iterations)) === parts[2];
  }
  if (parts[0] === 'sha256' && parts.length === 2) {
    return (await sha256Hex(password, salt)) === parts[1];
  }
  // Untagged legacy hash (raw SHA-256 hex): verify against that format.
  return (await sha256Hex(password, salt)) === storedHash;
};

const USERS_KEY = 'geekcollab_users';
const FORUM_STATE_KEY = 'geekcollab_forum_state';
const AUTH_SESSION_KEY = 'geekcollab_auth_session_user_id';
const FIREBASE_USERS_COLLECTION = 'users';
const FIREBASE_FORUMS_COLLECTION = 'forums';
const FIREBASE_DISCUSSIONS_COLLECTION = 'discussions';
const FIREBASE_FORUM_META_COLLECTION = 'forumMeta';
const FIREBASE_FORUM_META_DOC = 'state';
const FIREBASE_LEGACY_STATE_COLLECTION = 'appState';
const FIREBASE_LEGACY_FORUM_STATE_DOC = 'forumState';
const FIREBASE_LEGACY_USERS_DOC = 'users';
let lastUsersSource = 'local';
let lastUsersSyncError = null;

const parseStoredUsers = (data) => {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getRemoteUsers = async (firestoreDb) => {
  const usersSnapshot = await getDocs(collection(firestoreDb, FIREBASE_USERS_COLLECTION));
  if (usersSnapshot.size > 0) {
    return usersSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  }

  const legacyUsersRef = doc(
    firestoreDb,
    FIREBASE_LEGACY_STATE_COLLECTION,
    FIREBASE_LEGACY_USERS_DOC
  );
  const legacySnapshot = await getDoc(legacyUsersRef);
  if (!legacySnapshot.exists()) return [];
  const users = legacySnapshot.data()?.users;
  return Array.isArray(users) ? users : [];
};

// Strip any plaintext `password` before a record is persisted. New records
// only carry passwordHash/passwordSalt; this defends against legacy objects or
// spread-in updates re-writing plaintext to Firestore/AsyncStorage.
const stripPlaintextPassword = (user) => {
  if (!user || typeof user !== 'object') return user;
  if (!('password' in user)) return user;
  const { password, ...rest } = user;
  return rest;
};

const secureUserForPersistence = async (user) => {
  if (!user || typeof user !== 'object') return user;
  if (typeof user.password === 'string' && (!user.passwordHash || !user.passwordSalt)) {
    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(user.password, passwordSalt);
    return {
      ...stripPlaintextPassword(user),
      passwordHash,
      passwordSalt,
    };
  }
  return stripPlaintextPassword(user);
};

const secureUsersForPersistence = async (users) =>
  Promise.all((Array.isArray(users) ? users : []).map(secureUserForPersistence));

// ADDITIVE/TARGETED sync: write or update each provided user doc, but do NOT
// delete remote docs that merely aren't in the local list. This removes the
// one-call "delete-by-diff" full-collection wipe primitive. Explicit deletions
// go through deleteUserRemote().
// Residual risk: a client can still overwrite an individual existing user doc
// (e.g. clobber another user's record) — there is no server identity to scope
// writes to the caller's own doc. That is DEFERRED to server auth.
const saveRemoteUsers = async (firestoreDb, users) => {
  const usersCollection = collection(firestoreDb, FIREBASE_USERS_COLLECTION);
  const safeUsers = await secureUsersForPersistence(users);

  await Promise.all(
    safeUsers.map((user) => setDoc(doc(usersCollection, String(user.id)), {
      ...user,
      id: String(user.id),
      updatedAt: new Date().toISOString(),
    }))
  );
  const legacyUsersRef = doc(
    firestoreDb,
    FIREBASE_LEGACY_STATE_COLLECTION,
    FIREBASE_LEGACY_USERS_DOC
  );
  if ((await getDoc(legacyUsersRef)).exists()) {
    await deleteDoc(legacyUsersRef);
  }
};

const getRemoteForumCollection = async (firestoreDb, collectionName) => {
  const snapshot = await getDocs(collection(firestoreDb, collectionName));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

// ADDITIVE/TARGETED sync: write or update each provided doc, but never
// delete-by-diff across the whole collection. Removing the old "delete every
// remote doc not in the local list" behavior eliminates a one-call wipe
// primitive (a stale/malicious client could otherwise drop every other forum
// or discussion). Explicit removals go through deleteForumRemote /
// deleteDiscussionRemote, called from the discrete delete handlers.
// Residual risk: individual existing docs can still be overwritten by any
// client (no server identity to scope writes); DEFERRED to server auth.
const syncRemoteForumCollection = async (firestoreDb, collectionName, items) => {
  const forumCollection = collection(firestoreDb, collectionName);

  await Promise.all(
    items.map((item) => setDoc(doc(forumCollection, String(item.id)), {
      ...item,
      id: String(item.id),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }))
  );
};

// Targeted single-doc remote deletes. These replace the destructive
// delete-by-diff path for explicit user-initiated deletions, so removing one
// item touches only that one Firestore document.
const deleteRemoteDoc = async (collectionName, id) => {
  if (!id) return;
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, collectionName, String(id)));
  } catch {
    // local state removal still proceeds even if remote delete fails
  }
};

export const deleteDiscussionRemote = async (discussionID) =>
  deleteRemoteDoc(FIREBASE_DISCUSSIONS_COLLECTION, discussionID);

export const deleteForumRemote = async (forumID) =>
  deleteRemoteDoc(FIREBASE_FORUMS_COLLECTION, forumID);

const getLegacyForumState = async (firestoreDb) => {
  const forumStateRef = doc(
    firestoreDb,
    FIREBASE_LEGACY_STATE_COLLECTION,
    FIREBASE_LEGACY_FORUM_STATE_DOC
  );
  const snapshot = await getDoc(forumStateRef);
  if (!snapshot.exists()) return null;
  return snapshot.data();
};

const setUsersSyncStatus = ({ source, error = null }) => {
  if (source) {
    lastUsersSource = source;
  }
  lastUsersSyncError = error;
};

export const saveUser = async (user) => {
  const safeUser = await secureUserForPersistence(user);
  const users = await getAllUsers();
  users.push(safeUser);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      await saveRemoteUsers(firestoreDb, users);
      setUsersSyncStatus({ source: 'remote', error: null });
    } catch {
      setUsersSyncStatus({ source: 'local', error: 'firestore-write-failed' });
      // keep local write even if remote fails
    }
  } else {
    setUsersSyncStatus({ source: 'local', error: null });
  }
};

export const getAllUsers = async () => {
  const data = await AsyncStorage.getItem(USERS_KEY);
  const localUsers = await secureUsersForPersistence(parseStoredUsers(data));
  if (JSON.stringify(localUsers) !== (data || '[]')) {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }

  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const remoteUsers = await getRemoteUsers(firestoreDb);
      const safeRemoteUsers = await secureUsersForPersistence(remoteUsers);
      setUsersSyncStatus({ source: 'remote', error: null });
      if (safeRemoteUsers.length > 0) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(safeRemoteUsers));
        if (JSON.stringify(safeRemoteUsers) !== JSON.stringify(remoteUsers)) {
          await saveRemoteUsers(firestoreDb, safeRemoteUsers);
        }
        return safeRemoteUsers;
      }
      if (localUsers.length > 0) {
        await saveRemoteUsers(firestoreDb, localUsers);
        setUsersSyncStatus({ source: 'remote', error: null });
      }
    } catch {
      setUsersSyncStatus({ source: 'local', error: 'firestore-read-failed' });
      // fallback to local users below
    }
  } else {
    setUsersSyncStatus({ source: 'local', error: null });
  }

  return localUsers;
};

export const getUsersSyncStatus = () => {
  return {
    firebaseConfigured: isFirebaseConfigured(),
    source: lastUsersSource,
    error: lastUsersSyncError,
  };
};

export const userExists = async (username) => {
  const users = await getAllUsers();
  return users.some((u) => u.username.toLowerCase() === username.toLowerCase());
};

export const isUsernameAvailable = async (username, excludeUserID = null) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (!normalizedUsername) return false;
  const users = await getAllUsers();
  return !users.some((user) => {
    if (!user?.username) return false;
    if (excludeUserID && user.id === excludeUserID) return false;
    return String(user.username).trim().toLowerCase() === normalizedUsername;
  });
};

// Persist a single user's record (additive/targeted — no collection wipe).
const persistUserRecord = async (user) => {
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) return;
  try {
    const safeUser = await secureUserForPersistence(user);
    const usersCollection = collection(firestoreDb, FIREBASE_USERS_COLLECTION);
    await setDoc(doc(usersCollection, String(safeUser.id)), {
      ...safeUser,
      id: String(safeUser.id),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // best-effort; local cache already holds the value
  }
};

export const getUser = async (username, password) => {
  const users = await getAllUsers();
  const candidate = users.find(
    (u) => u.username && u.username.toLowerCase() === username.toLowerCase()
  );
  if (!candidate) return null;

  // Preferred path: salted-hash comparison (format-aware: PBKDF2 or SHA-256).
  if (candidate.passwordHash && candidate.passwordSalt) {
    const ok = await verifyPassword(password, candidate.passwordSalt, candidate.passwordHash);
    return ok ? candidate : null;
  }

  // Legacy path: record still holds a plaintext `password`. Compare once, and
  // on success transparently migrate it to a salted hash so plaintext is never
  // written again.
  if (typeof candidate.password === 'string') {
    if (candidate.password !== password) return null;
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const migrated = { ...candidate, passwordHash, passwordSalt: salt };
    delete migrated.password;

    const users2 = users.map((u) => (u.id === migrated.id ? migrated : u));
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users2));
    await persistUserRecord(migrated);
    return migrated;
  }

  return null;
};

export const updateUserBanStatus = async (userID, isBanned) => {
  const users = await getAllUsers();
  let changed = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;
    changed = { ...user, isBanned };
    return changed;
  });
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  // Targeted write of only the affected user doc (no full-collection rewrite).
  if (changed) await persistUserRecord(changed);
};

export const updateUserMuteStatus = async (userID, mutedUntil) => {
  const users = await getAllUsers();
  let changed = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;
    changed = { ...user, mutedUntil: mutedUntil || null };
    return changed;
  });
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  if (changed) await persistUserRecord(changed);
};

export const updateUserRole = async (userID, role, options = {}) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!userID || !normalizedRole) return false;

  const { addForumModerator, removeForumModerator } = options;

  const users = await getAllUsers();
  let changed = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;

    let forumModerators = Array.isArray(user.forumModerators) ? [...user.forumModerators] : [];

    if (addForumModerator) {
      if (!forumModerators.includes(addForumModerator)) {
        forumModerators.push(addForumModerator);
      }
    }

    if (removeForumModerator) {
      forumModerators = forumModerators.filter((fid) => fid !== removeForumModerator);
    }

    changed = { ...user, role: normalizedRole, forumModerators };
    return changed;
  });
  if (!changed) return false;

  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  // Targeted write of only the affected user doc (no full-collection rewrite).
  await persistUserRecord(changed);
  return true;
};

export const updateUserProfile = async (userID, updates = {}) => {
  if (!userID) return null;

  // Never let a profile update (re)introduce a plaintext password field, and
  // cap free-text bio length to bound document size.
  const { password: _ignoredPassword, ...safeUpdates } = updates || {};
  const MAX_BIO_LEN = 500;

  const users = await getAllUsers();
  let updatedUser = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;
    const nextUsername = safeUpdates.username !== undefined ? String(safeUpdates.username).trim() : user.username;
    const nextBio = safeUpdates.bio !== undefined
      ? String(safeUpdates.bio).trim().slice(0, MAX_BIO_LEN)
      : user.bio;
    updatedUser = {
      ...stripPlaintextPassword(user),
      ...safeUpdates,
      username: nextUsername,
      displayName: safeUpdates.displayName !== undefined ? String(safeUpdates.displayName).trim() : user.displayName,
      bio: nextBio,
      profileImage: safeUpdates.profileImage !== undefined ? safeUpdates.profileImage : user.profileImage,
    };
    return updatedUser;
  });

  if (!updatedUser) return null;
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  // Targeted write of only the affected user doc (no full-collection rewrite).
  await persistUserRecord(updatedUser);

  return updatedUser;
};

export const getUserById = async (id) => {
  if (!id) return null;
  const users = await getAllUsers();
  return users.find((user) => user.id === id) || null;
};

export const saveActiveSessionUserID = async (userID) => {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, userID);
};

export const getActiveSessionUserID = async () => {
  return AsyncStorage.getItem(AUTH_SESSION_KEY);
};

export const clearActiveSessionUserID = async () => {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
};

export const deleteAllUsers = async () => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const usersCollection = collection(firestoreDb, FIREBASE_USERS_COLLECTION);
      const snapshot = await getDocs(usersCollection);
      await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));

      const legacyUsersRef = doc(
        firestoreDb,
        FIREBASE_LEGACY_STATE_COLLECTION,
        FIREBASE_LEGACY_USERS_DOC
      );
      if ((await getDoc(legacyUsersRef)).exists()) {
        await deleteDoc(legacyUsersRef);
      }
    } catch {
      // continue local clear even if remote delete fails
    }
  }
  await AsyncStorage.removeItem(USERS_KEY);
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
};

export const saveForumState = async (forumState) => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    await syncRemoteForumCollection(firestoreDb, FIREBASE_FORUMS_COLLECTION, forumState.forums || []);
    await syncRemoteForumCollection(firestoreDb, FIREBASE_DISCUSSIONS_COLLECTION, forumState.discussions || []);

    const forumMetaRef = doc(
      firestoreDb,
      FIREBASE_FORUM_META_COLLECTION,
      FIREBASE_FORUM_META_DOC
    );
    await setDoc(forumMetaRef, {
      selectedForumID: forumState.selectedForumID || null,
      mutedUsers: forumState.mutedUsers || {},
      bannedUsers: forumState.bannedUsers || {},
      blockedWords: forumState.blockedWords || [],
      notifications: forumState.notifications || [],
      knownUsers: forumState.knownUsers || {},
      postHistoryCounts: forumState.postHistoryCounts || {},
      deletedDiscussions: forumState.deletedDiscussions || [],
      updatedAt: new Date().toISOString(),
    });

    const legacyForumStateRef = doc(
      firestoreDb,
      FIREBASE_LEGACY_STATE_COLLECTION,
      FIREBASE_LEGACY_FORUM_STATE_DOC
    );
    if ((await getDoc(legacyForumStateRef)).exists()) {
      await deleteDoc(legacyForumStateRef);
    }
  }
  await AsyncStorage.setItem(FORUM_STATE_KEY, JSON.stringify(forumState));
};

export const getForumState = async () => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const [remoteForums, remoteDiscussions, metaSnapshot] = await Promise.all([
        getRemoteForumCollection(firestoreDb, FIREBASE_FORUMS_COLLECTION),
        getRemoteForumCollection(firestoreDb, FIREBASE_DISCUSSIONS_COLLECTION),
        getDoc(doc(firestoreDb, FIREBASE_FORUM_META_COLLECTION, FIREBASE_FORUM_META_DOC)),
      ]);

      if (remoteForums.length > 0 || remoteDiscussions.length > 0 || metaSnapshot.exists()) {
        const remoteMeta = metaSnapshot.exists() ? metaSnapshot.data() : {};
        const remoteState = {
          discussions: remoteDiscussions,
          forums: remoteForums,
          selectedForumID: remoteMeta?.selectedForumID || null,
          mutedUsers: remoteMeta?.mutedUsers || {},
          bannedUsers: remoteMeta?.bannedUsers || {},
          blockedWords: remoteMeta?.blockedWords || [],
          notifications: remoteMeta?.notifications || [],
          knownUsers: remoteMeta?.knownUsers || {},
          postHistoryCounts: remoteMeta?.postHistoryCounts || {},
          deletedDiscussions: remoteMeta?.deletedDiscussions || [],
        };
        await AsyncStorage.setItem(FORUM_STATE_KEY, JSON.stringify(remoteState));
        return remoteState;
      }

      const legacyState = await getLegacyForumState(firestoreDb);
      if (legacyState) {
        await saveForumState(legacyState);
        await deleteDoc(doc(firestoreDb, FIREBASE_LEGACY_STATE_COLLECTION, FIREBASE_LEGACY_FORUM_STATE_DOC));
        return legacyState;
      }
    } catch {
      // fall back to local AsyncStorage below
    }
  }

  const data = await AsyncStorage.getItem(FORUM_STATE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const migrateDatabaseSchema = async () => {
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) {
    return { migrated: false, reason: 'firebase-not-configured' };
  }

  try {
    const [remoteUsers, remoteForums, remoteDiscussions, metaSnapshot, legacyUsersSnapshot, legacyForumSnapshot] = await Promise.all([
      getRemoteUsers(firestoreDb),
      getRemoteForumCollection(firestoreDb, FIREBASE_FORUMS_COLLECTION),
      getRemoteForumCollection(firestoreDb, FIREBASE_DISCUSSIONS_COLLECTION),
      getDoc(doc(firestoreDb, FIREBASE_FORUM_META_COLLECTION, FIREBASE_FORUM_META_DOC)),
      getDoc(doc(firestoreDb, FIREBASE_LEGACY_STATE_COLLECTION, FIREBASE_LEGACY_USERS_DOC)),
      getDoc(doc(firestoreDb, FIREBASE_LEGACY_STATE_COLLECTION, FIREBASE_LEGACY_FORUM_STATE_DOC)),
    ]);

    let didMigrate = false;

    if (legacyUsersSnapshot.exists() && remoteUsers.length === 0) {
      const legacyUsers = legacyUsersSnapshot.data()?.users;
      if (Array.isArray(legacyUsers) && legacyUsers.length > 0) {
        await saveRemoteUsers(firestoreDb, legacyUsers);
        didMigrate = true;
      }
      await deleteDoc(legacyUsersSnapshot.ref);
    } else if (legacyUsersSnapshot.exists()) {
      await deleteDoc(legacyUsersSnapshot.ref);
    }

    const hasNewForumSchema = remoteForums.length > 0 || remoteDiscussions.length > 0 || metaSnapshot.exists();
    if (legacyForumSnapshot.exists() && !hasNewForumSchema) {
      const legacyState = legacyForumSnapshot.data();
      if (legacyState) {
        await saveForumState(legacyState);
        didMigrate = true;
      }
      await deleteDoc(legacyForumSnapshot.ref);
    } else if (legacyForumSnapshot.exists()) {
      await deleteDoc(legacyForumSnapshot.ref);
    }

    return { migrated: didMigrate, reason: didMigrate ? 'legacy-data-migrated' : 'schema-already-organized' };
  } catch (error) {
    return { migrated: false, reason: 'migration-failed', error };
  }
};

export const clearForumState = async () => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const [forumsSnapshot, discussionsSnapshot] = await Promise.all([
        getDocs(collection(firestoreDb, FIREBASE_FORUMS_COLLECTION)),
        getDocs(collection(firestoreDb, FIREBASE_DISCUSSIONS_COLLECTION)),
      ]);
      await Promise.all([
        ...forumsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)),
        ...discussionsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)),
      ]);

      const forumMetaRef = doc(
        firestoreDb,
        FIREBASE_FORUM_META_COLLECTION,
        FIREBASE_FORUM_META_DOC
      );
      if ((await getDoc(forumMetaRef)).exists()) {
        await deleteDoc(forumMetaRef);
      }

      const legacyForumStateRef = doc(
        firestoreDb,
        FIREBASE_LEGACY_STATE_COLLECTION,
        FIREBASE_LEGACY_FORUM_STATE_DOC
      );
      if ((await getDoc(legacyForumStateRef)).exists()) {
        await deleteDoc(legacyForumStateRef);
      }
    } catch {
      // continue clearing local state even if remote clear fails
    }
  }
  await AsyncStorage.removeItem(FORUM_STATE_KEY);
};
