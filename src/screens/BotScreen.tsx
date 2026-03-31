import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type BotRequestRow = {
  first_name: string;
  last_name: string;
  mt5_login: string;
  mt5_server: string;
  mt5_password: string;
  status: 'pending' | 'configured';
  bot_enabled: boolean;
  updated_at: string;
};

const DEFAULT_MT5_SERVER = 'VTMarkets-Live 6';

export function BotScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState(DEFAULT_MT5_SERVER);
  const [mt5Password, setMt5Password] = useState('');
  const [status, setStatus] = useState<'pending' | 'configured' | null>(null);
  const [botEnabled, setBotEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('bot_requests')
      .select('first_name, last_name, mt5_login, mt5_server, mt5_password, status, bot_enabled, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const row = (data as BotRequestRow | null) ?? null;
    if (row) {
      setFirstName(row.first_name ?? '');
      setLastName(row.last_name ?? '');
      setMt5Login(row.mt5_login ?? '');
      setMt5Server(row.mt5_server ?? DEFAULT_MT5_SERVER);
      setMt5Password(row.mt5_password ?? '');
      setStatus(row.status ?? 'pending');
      setBotEnabled(Boolean(row.bot_enabled));
      setUpdatedAt(row.updated_at ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const submitRequest = async () => {
    if (!user) return;
    if (!firstName.trim()) {
      Alert.alert(t('common.error'), t('bot.firstNameRequired'));
      return;
    }
    if (!lastName.trim()) {
      Alert.alert(t('common.error'), t('bot.lastNameRequired'));
      return;
    }
    if (!mt5Login.trim()) {
      Alert.alert(t('common.error'), t('bot.loginRequired'));
      return;
    }
    if (!mt5Server.trim()) {
      Alert.alert(t('common.error'), t('bot.serverRequired'));
      return;
    }
    if (!mt5Password.trim()) {
      Alert.alert(t('common.error'), t('bot.passwordRequired'));
      return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();
    const payload = {
      user_id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      mt5_login: mt5Login.trim(),
      mt5_server: mt5Server.trim() || DEFAULT_MT5_SERVER,
      mt5_password: mt5Password.trim(),
      status: 'pending',
      bot_enabled: false,
      updated_at: nowIso,
    } as unknown as never;

    const { error } = await supabase
      .from('bot_requests')
      .upsert(payload, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }

    setStatus('pending');
    setBotEnabled(false);
    setUpdatedAt(nowIso);
    Alert.alert(t('common.ok'), t('bot.requestSent'));
  };

  if (profile?.role === 'manager') {
    return (
      <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('bot.managerTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('bot.managerUseManagerPage')}</Text>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('bot.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('bot.subtitle')}
          </Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.firstName')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('bot.firstNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.lastName')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('bot.lastNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Login')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={mt5Login}
                onChangeText={setMt5Login}
                placeholder={t('bot.mt5LoginPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Server')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={mt5Server}
                onChangeText={setMt5Server}
                placeholder={t('bot.mt5ServerPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Password')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={mt5Password}
                onChangeText={setMt5Password}
                placeholder={t('bot.mt5PasswordPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={submitRequest}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('bot.connect')}</Text>
                )}
              </TouchableOpacity>

              <Text
                style={[
                  styles.stateText,
                  { color: botEnabled ? theme.success : status === 'pending' ? theme.warning : theme.textSecondary },
                ]}
              >
                {botEnabled
                  ? t('bot.statusActive')
                  : status === 'pending'
                    ? t('bot.statusPending')
                    : t('bot.statusInactive')}
              </Text>

              <Text style={[styles.note, { color: theme.textSecondary }]}>
                {updatedAt
                  ? `${t('bot.lastUpdate')} ${new Date(updatedAt).toLocaleString()}`
                  : t('bot.notConfigured')}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 6, marginBottom: 18 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stateText: { marginTop: 12, fontSize: 13, fontWeight: '700' },
  note: { marginTop: 6, fontSize: 12 },
});
