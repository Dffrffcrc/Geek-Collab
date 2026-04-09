 
import { useState, useEffect, useCallback } from 'react';
import { createUser } from './Models';
import {
  saveUser,
  userExists,
  getUser,
  getUserById,
  getUsersSyncStatus,
  migrateDatabaseSchema,
  saveActiveSessionUserID,
  getActiveSessionUserID,
  clearActiveSessionUserID,
} from './StorageExtension';
import { hasModerationMatch } from './ContentModeration';
import uuid from 'react-native-uuid';

export const useAuthViewModel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newUserNotice, setNewUserNotice] = useState('');

  // On mount: restore active saved session user
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await migrateDatabaseSchema();
        const activeUserID = await getActiveSessionUserID();
        if (!activeUserID) return;
        const activeUser = await getUserById(activeUserID);
        if (activeUser && !activeUser.isBanned) {
          setCurrentUser(activeUser);
          setIsLoggedIn(true);
        } else {
          await clearActiveSessionUserID();
        }
      } finally {
        setIsAuthReady(true);
      }
    };
    restoreSession();
  }, []);

  const signUp = useCallback(async (username, password, confirmPassword, role = 'user') => {
    const normalizedUsername = String(username || '').trim();

    if (!normalizedUsername || !password || !confirmPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (normalizedUsername.length < 3) {
      setAuthError('Username must be at least 3 characters');
      return;
    }
    if (hasModerationMatch(normalizedUsername)) {
      setAuthError('Username contains disallowed language');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords don't match");
      return;
    }

    const exists = await userExists(normalizedUsername);
    if (exists) {
      setAuthError('Username already taken');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    await new Promise((r) => setTimeout(r, 500));

    const newUser = createUser({
      id: uuid.v4(),
      username: normalizedUsername,
      password,
      role,
      bio: '',
      profileImage: null,
      createdAt: new Date().toISOString(),
    });

    await saveUser(newUser);
    await saveActiveSessionUserID(newUser.id);
    setCurrentUser(newUser);
    setIsLoggedIn(true);
    setNewUserNotice(`Welcome ${normalizedUsername}! Your role is ${role}.`);
    setIsLoading(false);
    setAuthError(null);
  }, []);

  const login = useCallback(async (username, password) => {
    if (!username || !password) {
      setAuthError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    await new Promise((r) => setTimeout(r, 500));

    const user = await getUser(username, password);
    if (user) {
      if (user.isBanned) {
        setAuthError('Your account has been banned by an admin.');
        setIsLoading(false);
        return;
      }
      await saveActiveSessionUserID(user.id);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setAuthError(null);
    } else {
      const syncStatus = getUsersSyncStatus();
      if (!syncStatus.firebaseConfigured) {
        setAuthError('Firebase config missing. Check EXPO_PUBLIC_FIREBASE_* environment values.');
      } else if (syncStatus.error === 'firestore-read-failed') {
        setAuthError('Cannot read accounts from Firestore. Check Firestore rules and project settings.');
      } else if (syncStatus.source === 'local') {
        setAuthError('No shared account data found. This app is using local-only auth data on this device.');
      } else {
        setAuthError('Invalid username or password');
      }
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setAuthError(null);
    clearActiveSessionUserID();
  }, []);

  const clearNewUserNotice = useCallback(() => {
    setNewUserNotice('');
  }, []);

  return {
    currentUser,
    isLoggedIn,
    isAuthReady,
    authError,
    setAuthError,
    isLoading,
    newUserNotice,
    signUp,
    login,
    logout,
    clearNewUserNotice,
  };
};
