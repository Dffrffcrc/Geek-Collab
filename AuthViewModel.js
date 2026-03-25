// AuthViewModel.js - Auth state & logic (converted from AuthViewModel.swift)
import { useState, useEffect, useCallback } from 'react';
import { createUser } from './Models';
import {
  saveUser,
  userExists,
  getUser,
  getUserById,
  saveActiveSessionUserID,
  getActiveSessionUserID,
  clearActiveSessionUserID,
} from './StorageExtension';
import uuid from 'react-native-uuid';

export const useAuthViewModel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newUserNotice, setNewUserNotice] = useState('');

  // On mount: restore active saved session user
  useEffect(() => {
    const restoreSession = async () => {
      const activeUserID = await getActiveSessionUserID();
      if (!activeUserID) return;
      const activeUser = await getUserById(activeUserID);
      if (activeUser && !activeUser.isBanned) {
        setCurrentUser(activeUser);
        setIsLoggedIn(true);
      } else {
        await clearActiveSessionUserID();
      }
    };
    restoreSession();
  }, []);

  const signUp = useCallback(async (username, password, confirmPassword, role = 'user') => {
    if (!username || !password || !confirmPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (username.length < 3) {
      setAuthError('Username must be at least 3 characters');
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

    const exists = await userExists(username);
    if (exists) {
      setAuthError('Username already taken');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    await new Promise((r) => setTimeout(r, 500));

    const newUser = createUser({
      id: uuid.v4(),
      username,
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
    setNewUserNotice(`Welcome ${username}! Your role is ${role}.`);
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
      setAuthError('Invalid username or password');
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
