 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './FirebaseClient';

const USERS_KEY = 'geekcollab_users';
const FORUM_STATE_KEY = 'geekcollab_forum_state';
const AUTH_SESSION_KEY = 'geekcollab_auth_session_user_id';
const FIREBASE_APP_STATE_COLLECTION = 'appState';
const FIREBASE_FORUM_STATE_DOC = 'forumState';
const FIREBASE_USERS_DOC = 'users';
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
  const usersRef = doc(
    firestoreDb,
    FIREBASE_APP_STATE_COLLECTION,
    FIREBASE_USERS_DOC
  );
  const snapshot = await getDoc(usersRef);
  if (!snapshot.exists()) return [];
  const users = snapshot.data()?.users;
  return Array.isArray(users) ? users : [];
};

const saveRemoteUsers = async (firestoreDb, users) => {
  const usersRef = doc(
    firestoreDb,
    FIREBASE_APP_STATE_COLLECTION,
    FIREBASE_USERS_DOC
  );
  await setDoc(usersRef, {
    users,
    updatedAt: new Date().toISOString(),
  });
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
      const usersRef = doc(
        firestoreDb,
        FIREBASE_APP_STATE_COLLECTION,
        FIREBASE_USERS_DOC
      );
      await deleteDoc(usersRef);
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
    const forumStateRef = doc(
      firestoreDb,
      FIREBASE_APP_STATE_COLLECTION,
      FIREBASE_FORUM_STATE_DOC
    );
    await setDoc(forumStateRef, {
      ...forumState,
      updatedAt: new Date().toISOString(),
    });
  }
  await AsyncStorage.setItem(FORUM_STATE_KEY, JSON.stringify(forumState));
};

export const getForumState = async () => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const forumStateRef = doc(
        firestoreDb,
        FIREBASE_APP_STATE_COLLECTION,
        FIREBASE_FORUM_STATE_DOC
      );
      const snapshot = await getDoc(forumStateRef);
      if (snapshot.exists()) {
        const remoteState = snapshot.data();
        if (remoteState) {
          await AsyncStorage.setItem(FORUM_STATE_KEY, JSON.stringify(remoteState));
          return remoteState;
        }
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

export const clearForumState = async () => {
  const firestoreDb = getFirestoreDb();
  if (firestoreDb) {
    try {
      const forumStateRef = doc(
        firestoreDb,
        FIREBASE_APP_STATE_COLLECTION,
        FIREBASE_FORUM_STATE_DOC
      );
      await deleteDoc(forumStateRef);
    } catch {
      // continue clearing local state even if remote clear fails
    }
  }
  await AsyncStorage.removeItem(FORUM_STATE_KEY);
};
