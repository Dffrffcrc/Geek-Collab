 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './FirebaseClient';

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

const saveRemoteUsers = async (firestoreDb, users) => {
  const usersCollection = collection(firestoreDb, FIREBASE_USERS_COLLECTION);
  const existingUsersSnapshot = await getDocs(usersCollection);
  const currentIds = new Set(users.map((user) => String(user.id)));

  await Promise.all(
    existingUsersSnapshot.docs
      .filter((snapshot) => !currentIds.has(snapshot.id))
      .map((snapshot) => deleteDoc(snapshot.ref))
  );

  await Promise.all(
    users.map((user) => setDoc(doc(usersCollection, String(user.id)), {
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

const syncRemoteForumCollection = async (firestoreDb, collectionName, items) => {
  const forumCollection = collection(firestoreDb, collectionName);
  const existingSnapshot = await getDocs(forumCollection);
  const currentIds = new Set(items.map((item) => String(item.id)));

  await Promise.all(
    existingSnapshot.docs
      .filter((snapshot) => !currentIds.has(snapshot.id))
      .map((snapshot) => deleteDoc(snapshot.ref))
  );

  await Promise.all(
    items.map((item) => setDoc(doc(forumCollection, String(item.id)), {
      ...item,
      id: String(item.id),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }))
  );
};

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
  const users = await getAllUsers();
  users.push(user);
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
  const localUsers = parseStoredUsers(data);

  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const remoteUsers = await getRemoteUsers(firestoreDb);
      setUsersSyncStatus({ source: 'remote', error: null });
      if (remoteUsers.length > 0) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(remoteUsers));
        return remoteUsers;
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

export const getUser = async (username, password) => {
  const users = await getAllUsers();
  return users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  ) || null;
};

export const updateUserBanStatus = async (userID, isBanned) => {
  const users = await getAllUsers();
  const nextUsers = users.map((user) =>
    user.id === userID ? { ...user, isBanned } : user
  );
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));

  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      await saveRemoteUsers(firestoreDb, nextUsers);
    } catch {
      // keep local update even if remote fails
    }
  }
};

export const updateUserMuteStatus = async (userID, mutedUntil) => {
  const users = await getAllUsers();
  const nextUsers = users.map((user) =>
    user.id === userID ? { ...user, mutedUntil: mutedUntil || null } : user
  );
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));

  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      await saveRemoteUsers(firestoreDb, nextUsers);
    } catch {
      // keep local update even if remote fails
    }
  }
};

export const updateUserRole = async (userID, role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!userID || !normalizedRole) return false;

  const users = await getAllUsers();
  let didUpdate = false;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;
    didUpdate = true;
    return { ...user, role: normalizedRole };
  });
  if (!didUpdate) return false;

  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      await saveRemoteUsers(firestoreDb, nextUsers);
    } catch {
      // keep local role update even if remote fails
    }
  }
  return true;
};

export const updateUserProfile = async (userID, updates = {}) => {
  if (!userID) return null;

  const users = await getAllUsers();
  let updatedUser = null;
  const nextUsers = users.map((user) => {
    if (user.id !== userID) return user;
    const nextUsername = updates.username !== undefined ? String(updates.username).trim() : user.username;
    updatedUser = {
      ...user,
      ...updates,
      username: nextUsername,
      displayName: updates.displayName !== undefined ? String(updates.displayName).trim() : user.displayName,
      bio: updates.bio !== undefined ? String(updates.bio).trim() : user.bio,
      profileImage: updates.profileImage !== undefined ? updates.profileImage : user.profileImage,
    };
    return updatedUser;
  });

  if (!updatedUser) return null;

  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      await saveRemoteUsers(firestoreDb, nextUsers);
    } catch {
      // keep local update even if remote fails
    }
  }

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
