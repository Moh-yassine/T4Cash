import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdminTraderData } from '../hooks/useAdminTraderData';

export function AdminUsersScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { users, historyByUser, loading, loadingHistoryFor, error, refresh, fetchHistory } = useAdminTraderData();
  const [openedUserId, setOpenedUserId] = useState<string | null>(null);

  const toggleHistory = async (userId: string) => {
    const isOpen = openedUserId === userId;
    if (isOpen) {
      setOpenedUserId(null);
      return;
    }
    setOpenedUserId(userId);
    if (!historyByUser[userId]) {
      await fetchHistory(userId);
    }
  };

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.headerCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('admin.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('admin.subtitle')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          users.map((user) => {
            const isOpen = openedUserId === user.user_id;
            const rows = historyByUser[user.user_id] ?? [];
            return (
              <View key={user.user_id} style={[styles.userCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {user.username || user.email || user.user_id}
                </Text>
                {!!user.email && (
                  <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                )}
                <Text style={[styles.remainingLabel, { color: theme.textSecondary }]}>
                  {t('admin.remaining')}
                </Text>
                <Text style={[styles.remainingValue, { color: theme.primary }]}>
                  {user.remaining.toFixed(2)} €
                </Text>

                <TouchableOpacity
                  style={[styles.historyBtn, { borderColor: theme.border }]}
                  onPress={() => toggleHistory(user.user_id)}
                >
                  <Text style={[styles.historyBtnText, { color: theme.text }]}>
                    {isOpen ? t('admin.hideHistory') : t('admin.showHistory')}
                  </Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.historyWrap, { borderTopColor: theme.border }]}>
                    {loadingHistoryFor === user.user_id ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : rows.length === 0 ? (
                      <Text style={[styles.historyEmpty, { color: theme.textSecondary }]}>
                        {t('admin.noHistory')}
                      </Text>
                    ) : (
                      rows.map((row) => (
                        <View key={row.payment_id} style={styles.historyRow}>
                          <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                            {row.paid_at}
                          </Text>
                          <Text style={[styles.historyAmount, { color: theme.text }]}>
                            {row.amount.toFixed(2)} €
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.surfaceVariant }]} onPress={refresh}>
          <Text style={[styles.refreshText, { color: theme.text }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 4 },
  userCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userName: { fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 12, marginTop: 2 },
  remainingLabel: { fontSize: 12, marginTop: 12 },
  remainingValue: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  historyBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  historyBtnText: { fontSize: 13, fontWeight: '600' },
  historyWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  historyEmpty: { fontSize: 12 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12 },
  historyAmount: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 12, marginTop: 8 },
  refreshBtn: {
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  refreshText: { fontSize: 14, fontWeight: '600' },
});
