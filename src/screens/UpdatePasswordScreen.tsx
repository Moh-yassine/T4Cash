import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { authStyles, AUTH_GRADIENT_COLORS, AUTH_PLACEHOLDER_COLOR } from '../styles/authStyles';

export function UpdatePasswordScreen({ navigation }: { navigation: any }) {
  const { t } = useLanguage();
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.passwordRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsMismatch'));
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(
        t('auth.passwordUpdated'),
        t('auth.passwordUpdatedMessage'),
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <AuthLayout scroll={true}>
      <View style={authStyles.header}>
        <Text style={authStyles.title}>{t('auth.setNewPassword')}</Text>
        <Text style={authStyles.subtitle}>{t('auth.setNewPasswordSubtitle')}</Text>
      </View>

      <View style={authStyles.form}>
        <TextInput
          style={authStyles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={AUTH_PLACEHOLDER_COLOR}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <TextInput
          style={[authStyles.input, authStyles.inputLast]}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor={AUTH_PLACEHOLDER_COLOR}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.9}
          style={authStyles.buttonWrap}
        >
          <LinearGradient
            colors={[...AUTH_GRADIENT_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[authStyles.button, loading && authStyles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>{t('auth.updatePassword')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.link} onPress={() => signOut()}>
        <Text style={authStyles.linkText}>
          <Text style={authStyles.linkHighlight}>{t('auth.backToLogin')}</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}
