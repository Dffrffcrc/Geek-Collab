// StorageExtension.js - AsyncStorage helpers (converted from UserDefaults+Extension.swift)
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'techcollab_users';

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

export const deleteAllUsers = async () => {
  await AsyncStorage.removeItem(USERS_KEY);
};
