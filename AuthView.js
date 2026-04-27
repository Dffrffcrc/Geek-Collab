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
import { Ionicons } from '@expo/vector-icons';

// Minimalist color palette
const Colors = {
  primary: '#2563EB',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  background: '#F9FAFB',
  danger: '#DC2626',
};

const AuthView = ({ authVM }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submitForm = () => {
    if (isLoginMode) {
      authVM.login(username, password);
    } else {
      authVM.signUp(username, displayName, password, confirmPassword);
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prev) => !prev);
    authVM.setAuthError(null);
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="hash" size={32} color={Colors.primary} />
            </View>
          </View>
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
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter password"
                placeholderTextColor="#B6BFCC"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="none"
              />
              <TouchableOpacity
                style={styles.visibilityButton}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#2563EB"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Display Name */}
          {!isLoginMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Display Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., John Doe"
                placeholderTextColor="#B6BFCC"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Confirm Password */}
          {!isLoginMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm password"
                  placeholderTextColor="#B6BFCC"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  textContentType="none"
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#2563EB"
                  />
                </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: 20 },
  logoContainer: { marginBottom: 16 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  appSubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: Colors.surface,
    ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  visibilityButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  roleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleChipText: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  roleChipTextActive: { color: Colors.primary, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  errorIcon: { fontSize: 18 },
  errorText: { fontSize: 13, color: Colors.danger, flex: 1 },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: Colors.surface, fontWeight: '600', fontSize: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  toggleText: { fontSize: 13, color: Colors.textMuted },
  toggleLink: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

export default AuthView;
