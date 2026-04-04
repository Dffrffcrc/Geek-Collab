import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

const AuthView = ({ authVM }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');

  const submitForm = () => {
    if (isLoginMode) {
      authVM.login(username, password);
    } else {
      authVM.signUp(username, password, confirmPassword, role);
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prev) => !prev);
    authVM.setAuthError(null);
    setPassword('');
    setConfirmPassword('');
    setRole('user');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>GeekCollab</Text>
          <Text style={styles.appSubtitle}>Connect. Share. Build Together</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#B6BFCC"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#B6BFCC"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="none"
            />
          </View>

          {/* Confirm Password */}
          {!isLoginMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#B6BFCC"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="none"
              />
            </View>
          )}

          {!isLoginMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {['user', 'moderator', 'admin'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.roleChip, role === item && styles.roleChipActive]}
                    onPress={() => setRole(item)}
                  >
                    <Text style={[styles.roleChipText, role === item && styles.roleChipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Error */}
          {authVM.authError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{authVM.authError}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, authVM.isLoading && styles.submitButtonDisabled]}
            onPress={submitForm}
            disabled={authVM.isLoading}
          >
            {authVM.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLoginMode ? 'Login' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <TouchableOpacity onPress={toggleMode}>
            <Text style={styles.toggleLink}>
              {isLoginMode ? ' Sign up here' : ' Login here'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingVertical: 40 },
  appTitle: { fontSize: 36, fontWeight: 'bold', color: '#2563EB' },
  appSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, color: '#9CA3AF' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  roleChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  roleChipText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  roleChipTextActive: { color: '#1D4ED8', fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: { fontSize: 12, color: '#DC2626', flex: 1 },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 32,
  },
  toggleText: { fontSize: 12, color: '#9CA3AF' },
  toggleLink: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
});

export default AuthView;
