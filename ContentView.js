// ContentView.js (converted from ContentView.swift)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthViewModel } from '../viewmodels/AuthViewModel';
import AuthView from './AuthView';
import ForumHomeView from './ForumHomeView';

const ContentView = () => {
  const authVM = useAuthViewModel();

  return (
    <View style={styles.container}>
      {authVM.isLoggedIn && authVM.currentUser ? (
        <ForumHomeView currentUser={authVM.currentUser} onLogout={authVM.logout} />
      ) : (
        <AuthView authVM={authVM} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default ContentView;
