 
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthViewModel } from './AuthViewModel';
import AuthView from './AuthView';
import ForumHomeView from './ForumHomeView';

const ContentView = () => {
  const authVM = useAuthViewModel();

  return (
    <View style={styles.container}>
      {!authVM.isAuthReady ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : authVM.isLoggedIn && authVM.currentUser ? (
        <ForumHomeView
          authVM={authVM}
          currentUser={authVM.currentUser}
          onLogout={authVM.logout}
          newUserNotice={authVM.newUserNotice}
          clearNewUserNotice={authVM.clearNewUserNotice}
        />
      ) : (
        <AuthView authVM={authVM} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default ContentView;
