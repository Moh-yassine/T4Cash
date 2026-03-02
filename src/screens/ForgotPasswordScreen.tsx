import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { authStyles, AUTH_GRADIENT_COLORS, AUTH_PLACEHOLDER_COLOR } from '../styles/authStyles';

/** URL où l'utilisateur est redirigé après avoir cliqué le lien dans l'email.
 * Doit être dans "Redirect URLs" du Dashboard Supabase (Auth → URL Configuration). */
function getRedirectUrl(): string {
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (appUrl) {
    const base = appUrl.replace(/\/$/, '');
    return `${base}`;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:8081';
}

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const { t } = useLanguage();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), 'Email requis');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim(), getRedirectUrl());
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      setSent(true);
      Alert.alert(
        t('auth.resetEmailSent'),
        t('auth.resetEmailCheck'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <AuthLayout scroll={true}>
      <View style={authStyles.header}>
        <Text style={authStyles.title}>{t('auth.forgotPassword')}</Text>
        <Text style={authStyles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
      </View>

      <View style={authStyles.form}>
        <TextInput
          style={[authStyles.input, authStyles.inputLast]}
          placeholder={t('auth.email')}
          placeholderTextColor={AUTH_PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!sent}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || sent}
          activeOpacity={0.9}
          style={authStyles.buttonWrap}
        >
          <LinearGradient
            colors={[...AUTH_GRADIENT_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[authStyles.button, (loading || sent) && authStyles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>
                {sent ? t('auth.resetEmailSent') : t('auth.sendResetLink')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.link} onPress={() => navigation.goBack()}>
        <Text style={authStyles.linkText}>
          <Text style={authStyles.linkHighlight}>{t('auth.backToLogin')}</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}
