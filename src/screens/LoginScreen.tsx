import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { authStyles, AUTH_GRADIENT_COLORS, AUTH_PLACEHOLDER_COLOR } from '../styles/authStyles';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), 'Email et mot de passe requis');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error.message);
  };

  return (
    <AuthLayout>
      <View style={authStyles.header}>
        <Text style={authStyles.title}>{t('auth.login')}</Text>
        <Text style={authStyles.subtitle}>Trade · Invest · Profit</Text>
      </View>

      <View style={authStyles.form}>
        <TextInput
          style={authStyles.input}
          placeholder={t('auth.email')}
          placeholderTextColor={AUTH_PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={authStyles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={AUTH_PLACEHOLDER_COLOR}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <TouchableOpacity
          style={authStyles.forgotLink}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={authStyles.forgotText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.9}
          style={authStyles.buttonWrap}
        >
          <LinearGradient
            colors={[...AUTH_GRADIENT_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={authStyles.button}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>{t('auth.signIn')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={authStyles.link}
        onPress={() => navigation.replace('Register')}
      >
        <Text style={authStyles.linkText}>
          {t('auth.noAccount')}{' '}
          <Text style={authStyles.linkHighlight}>{t('auth.signUp')}</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}
