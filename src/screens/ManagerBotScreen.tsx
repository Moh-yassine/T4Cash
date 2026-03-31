import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type BotRequestRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  mt5_login: string;
  mt5_server: string;
  mt5_password: string;
  status: 'pending' | 'configured';
  bot_enabled: boolean;
  updated_at: string;
};

type ProfileMap = Record<string, { email: string | null; username: string | null }>;

export function ManagerBotScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BotRequestRow[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<ProfileMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bot_requests')
      .select('id, user_id, first_name, last_name, mt5_login, mt5_server, mt5_password, status, bot_enabled, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      setLoading(false);
      Alert.alert(t('common.error'), error.message);
      return;
    }

    const botRows = (data as BotRequestRow[] | null) ?? [];
    setRows(botRows);

    const userIds = Array.from(new Set(botRows.map((r) => r.user_id)));
    if (userIds.length === 0) {
      setProfilesByUser({});
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', userIds);

    const map: ProfileMap = {};
    (profiles ?? []).forEach((p) => {
      map[p.id] = { email: p.email ?? null, username: p.username ?? null };
    });
    setProfilesByUser(map);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleBot = useCallback(async (row: BotRequestRow) => {
    const nextEnabled = !row.bot_enabled;
    setSavingId(row.id);
    const payload = {
      bot_enabled: nextEnabled,
      status: nextEnabled ? 'configured' : 'pending',
      updated_at: new Date().toISOString(),
    } as unknown as never;

    const { error } = await supabase
      .from('bot_requests')
      .update(payload)
      .eq('id', row.id);

    setSavingId(null);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    fetchData();
  }, [fetchData, t]);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  if (profile?.role !== 'manager' && profile?.role !== 'admin') {
    return (
      <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('common.error')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('bot.managerOnly')}
          </Text>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('bot.managerTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('bot.managerSubtitle')}
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {t('bot.pendingRequests')}: {pendingCount}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: theme.border }]}
            onPress={fetchData}
          >
            <Text style={[styles.refreshText, { color: theme.textSecondary }]}>{t('bot.refresh')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : rows.length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('bot.noRequests')}</Text>
          </View>
        ) : (
          rows.map((row) => {
            const profileRow = profilesByUser[row.user_id];
            const fullName = `${row.first_name} ${row.last_name}`.trim();
            return (
              <View key={row.id} style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.userName, { color: theme.text }]}>{fullName || '-'}</Text>
                <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                  {profileRow?.email || profileRow?.username || row.user_id}
                </Text>
                <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                  MT5: {row.mt5_login}
                </Text>
                <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                  {t('bot.mt5Server')}: {row.mt5_server}
                </Text>
                <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                  {t('bot.mt5Password')}: {row.mt5_password}
                </Text>
                <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                  {t('bot.lastUpdate')}: {new Date(row.updated_at).toLocaleString()}
                </Text>

                <View style={styles.statusRow}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: row.bot_enabled ? theme.success : theme.warning },
                    ]}
                  >
                    {row.bot_enabled ? t('bot.statusActive') : t('bot.statusInactive')}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      { backgroundColor: row.bot_enabled ? theme.danger : theme.primary },
                    ]}
                    onPress={() => toggleBot(row)}
                    disabled={savingId === row.id}
                  >
                    {savingId === row.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.toggleBtnText}>
                        {row.bot_enabled ? t('bot.deactivate') : t('bot.activate')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 6 },
  badge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  refreshBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  refreshText: { fontSize: 12, fontWeight: '600' },
  userName: { fontSize: 16, fontWeight: '700' },
  userMeta: { fontSize: 12, marginTop: 4 },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 115,
    alignItems: 'center',
  },
  toggleBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
