// StorageExtension.js - AsyncStorage helpers (converted from UserDefaults+Extension.swift)
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'techcollab_users';
const FORUM_STATE_KEY = 'techcollab_forum_state';
const AUTH_SESSION_KEY = 'techcollab_auth_session_user_id';

export const saveUser = async (user) => {
  const users = await getAllUsers();
  users.push(user);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getAllUsers = async () => {
  const data = await AsyncStorage.getItem(USERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
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
};

export const updateUserMuteStatus = async (userID, mutedUntil) => {
  const users = await getAllUsers();
  const nextUsers = users.map((user) =>
    user.id === userID ? { ...user, mutedUntil: mutedUntil || null } : user
  );
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
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
  await AsyncStorage.removeItem(USERS_KEY);
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
};

export const saveForumState = async (forumState) => {
  await AsyncStorage.setItem(FORUM_STATE_KEY, JSON.stringify(forumState));
};

export const getForumState = async () => {
  const data = await AsyncStorage.getItem(FORUM_STATE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const clearForumState = async () => {
  await AsyncStorage.removeItem(FORUM_STATE_KEY);
};
