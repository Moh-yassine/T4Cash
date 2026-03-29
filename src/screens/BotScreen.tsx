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

type Mt5Credentials = {
  mt5_login: string;
  mt5_server: string | null;
  mt5_password: string;
  lot_size: number;
  updated_at: string;
};

type BotPosition = {
  id: string;
  symbol: string;
  lot: number;
  profit: number;
  openedAt: string | null;
  closedAt: string | null;
};

const BOT_REGISTER_URL = 'http://72.62.185.118:8004/accounts/register';
const BOT_BASE_URL = 'http://72.62.185.118:8004';
const FIXED_LOT_SIZE = 0.02;

function parseDateTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function normalizePositions(payload: unknown): BotPosition[] {
  const container = payload as { positions?: unknown[]; data?: unknown[] } | unknown[];
  const rows = Array.isArray(container)
    ? container
    : Array.isArray(container?.positions)
      ? container.positions
      : Array.isArray(container?.data)
        ? container.data
        : [];

  return rows.map((row, idx) => {
    const r = row as Record<string, unknown>;
    const symbol = String(r.symbol ?? r.ticker ?? r.instrument ?? '-');
    const lot = Number(r.lot ?? r.volume ?? r.lot_size ?? 0);
    const profit = Number(r.profit ?? r.pnl ?? r.gain_loss ?? 0);
    const openedAt = parseDateTime(r.open_time ?? r.opened_at ?? r.time_open ?? r.openTime);
    const closedAt = parseDateTime(r.close_time ?? r.closed_at ?? r.time_close ?? r.closeTime);
    const id = String(r.id ?? r.ticket ?? `${symbol}-${openedAt ?? 'na'}-${idx}`);
    return {
      id,
      symbol,
      lot: Number.isFinite(lot) ? lot : 0,
      profit: Number.isFinite(profit) ? profit : 0,
      openedAt,
      closedAt,
    };
  });
}

export function BotScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [login, setLogin] = useState('');
  const [server, setServer] = useState('');
  const [password, setPassword] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [positions, setPositions] = useState<BotPosition[]>([]);

  const fetchOpenPositions = useCallback(async (forcedLogin?: string, forcedServer?: string) => {
    const loginValue = (forcedLogin ?? login).trim();
    const serverValue = (forcedServer ?? server).trim();
    const loginNumber = Number(loginValue);

    if (!Number.isFinite(loginNumber) || loginNumber <= 0 || !serverValue) {
      setPositions([]);
      setPositionsError(null);
      return;
    }

    setPositionsLoading(true);
    setPositionsError(null);

    try {
      const calls: Array<() => Promise<Response>> = [
        () =>
          fetch(`${BOT_BASE_URL}/accounts/positions/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginNumber, server: serverValue }),
          }),
        () =>
          fetch(`${BOT_BASE_URL}/accounts/positions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginNumber, server: serverValue }),
          }),
        () => fetch(`${BOT_BASE_URL}/accounts/${loginNumber}/positions/open`),
        () => fetch(`${BOT_BASE_URL}/accounts/${loginNumber}/positions`),
      ];

      let loaded = false;
      for (const run of calls) {
        const res = await run();
        if (!res.ok) continue;
        const body = await res.json().catch(() => ({}));
        const list = normalizePositions(body);
        setPositions(list);
        loaded = true;
        break;
      }

      if (!loaded) {
        setPositions([]);
        setPositionsError(t('bot.positionsUnavailable'));
      }
    } catch {
      setPositions([]);
      setPositionsError(t('bot.positionsUnavailable'));
    } finally {
      setPositionsLoading(false);
    }
  }, [login, server, t]);

  const fetchCredentials = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('mt5_credentials')
      .select('mt5_login, mt5_server, mt5_password, lot_size, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const row = (data as Mt5Credentials | null) ?? null;
    if (row) {
      const loginValue = row.mt5_login ?? '';
      const serverValue = row.mt5_server ?? '';
      setLogin(loginValue);
      setServer(serverValue);
      setPassword(row.mt5_password ?? '');
      setUpdatedAt(row.updated_at ?? null);
      await fetchOpenPositions(loginValue, serverValue);
    }
    setLoading(false);
  }, [fetchOpenPositions, user]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const connectToBot = async () => {
    if (!user) return;
    const loginNumber = Number(login.trim());
    if (!Number.isFinite(loginNumber) || loginNumber <= 0) {
      Alert.alert(t('common.error'), t('bot.loginRequired'));
      return;
    }
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('bot.passwordRequired'));
      return;
    }
    if (!server.trim()) {
      Alert.alert(t('common.error'), t('bot.serverRequired'));
      return;
    }
    setSaving(true);
    try {
      const registerRes = await fetch(BOT_REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginNumber,
          password: password.trim(),
          server: server.trim(),
          lot_size: FIXED_LOT_SIZE,
        }),
      });

      const registerBody = (await registerRes.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
        error?: string;
      };

      if (!registerRes.ok) {
        const message = registerBody.detail ?? registerBody.message ?? registerBody.error ?? t('bot.connectFailed');
        Alert.alert(t('common.error'), message);
        return;
      }

      const nowIso = new Date().toISOString();
      const payload = {
        user_id: user.id,
        mt5_login: login.trim(),
        mt5_server: server.trim() || null,
        mt5_password: password.trim(),
        lot_size: FIXED_LOT_SIZE,
        updated_at: nowIso,
      } as unknown as never;

      const { error } = await supabase
        .from('mt5_credentials')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        Alert.alert(t('common.error'), error.message);
        return;
      }

      setUpdatedAt(nowIso);
      await fetchOpenPositions(login.trim(), server.trim());
      Alert.alert(t('common.ok'), t('bot.connected'));
    } catch {
      Alert.alert(t('common.error'), t('bot.connectFailed'));
    } finally {
      setSaving(false);
    }
  };

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
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Login')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={login}
                onChangeText={setLogin}
                placeholder={t('bot.mt5LoginPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Server')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={server}
                onChangeText={setServer}
                placeholder={t('bot.mt5ServerPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('bot.mt5Password')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('bot.mt5PasswordPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={connectToBot}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('bot.connect')}</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.note, { color: theme.textSecondary }]}>
                {updatedAt
                  ? `${t('bot.lastUpdate')} ${new Date(updatedAt).toLocaleString()}`
                  : t('bot.notConfigured')}
              </Text>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 14 }]}>
          <View style={styles.positionsHeader}>
            <Text style={[styles.positionsTitle, { color: theme.text }]}>{t('bot.openPositionsTitle')}</Text>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: theme.border }]}
              onPress={() => fetchOpenPositions()}
              disabled={positionsLoading}
            >
              <Text style={[styles.refreshBtnText, { color: theme.textSecondary }]}>
                {t('bot.refresh')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headCell, styles.symbolCell, { color: theme.textSecondary }]}>{t('bot.colSymbol')}</Text>
            <Text style={[styles.headCell, styles.smallCell, { color: theme.textSecondary }]}>{t('bot.colLot')}</Text>
            <Text style={[styles.headCell, styles.profitCell, { color: theme.textSecondary }]}>{t('bot.colProfit')}</Text>
            <Text style={[styles.headCell, styles.timeCell, { color: theme.textSecondary }]}>{t('bot.colOpenTime')}</Text>
            <Text style={[styles.headCell, styles.timeCell, { color: theme.textSecondary }]}>{t('bot.colCloseTime')}</Text>
          </View>

          {positionsLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 14 }} />
          ) : positionsError ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{positionsError}</Text>
          ) : positions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('bot.noOpenPositions')}</Text>
          ) : (
            positions.map((p) => (
              <View key={p.id} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowCell, styles.symbolCell, { color: theme.text }]} numberOfLines={1}>
                  {p.symbol}
                </Text>
                <Text style={[styles.rowCell, styles.smallCell, { color: theme.text }]}>
                  {p.lot.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.rowCell,
                    styles.profitCell,
                    { color: p.profit >= 0 ? theme.success : theme.danger },
                  ]}
                >
                  {p.profit >= 0 ? '+' : ''}{p.profit.toFixed(2)} €
                </Text>
                <Text style={[styles.rowCell, styles.timeCell, { color: theme.textSecondary }]} numberOfLines={1}>
                  {p.openedAt ?? '-'}
                </Text>
                <Text style={[styles.rowCell, styles.timeCell, { color: theme.textSecondary }]} numberOfLines={1}>
                  {p.closedAt ?? '-'}
                </Text>
              </View>
            ))
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
  note: { marginTop: 12, fontSize: 12 },
  positionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  positionsTitle: { fontSize: 16, fontWeight: '700' },
  refreshBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '600' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  headCell: { fontSize: 11, fontWeight: '700' },
  rowCell: { fontSize: 12 },
  symbolCell: { flex: 1.2 },
  smallCell: { flex: 0.7, textAlign: 'center' },
  profitCell: { flex: 1, textAlign: 'center' },
  timeCell: { flex: 1.6, textAlign: 'right' },
  emptyText: { marginTop: 10, fontSize: 12 },
});
