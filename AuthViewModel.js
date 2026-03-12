// AuthViewModel.js - Auth state & logic (converted from AuthViewModel.swift)
import { useState, useEffect, useCallback } from 'react';
import { createUser } from '../models/Models';
import { saveUser, getAllUsers, userExists, getUser } from '../utils/StorageExtension';
import uuid from 'react-native-uuid';

export const useAuthViewModel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // On mount: restore first saved user session (mirrors Swift init)
  useEffect(() => {
    const restoreSession = async () => {
      const allUsers = await getAllUsers();
      if (allUsers.length > 0) {
        setCurrentUser(allUsers[0]);
        setIsLoggedIn(true);
      }
    };
    restoreSession();
  }, []);

  const signUp = useCallback(async (username, password, confirmPassword) => {
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
      bio: '',
      profileImage: null,
      createdAt: new Date().toISOString(),
    });

    await saveUser(newUser);
    setCurrentUser(newUser);
    setIsLoggedIn(true);
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
  }, []);

  return { currentUser, isLoggedIn, authError, setAuthError, isLoading, signUp, login, logout };
};
