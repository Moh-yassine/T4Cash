import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useVersementStats } from '../hooks/useVersementStats';
import type { RootStackParamList } from '../navigation/AppNavigator';

export function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    totalNet,
    traderShareTotal,
    totalGains,
    totalPertes,
    daysWithEntries,
  } = useVersementStats();

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: theme.textSecondary }]}>
          {t('home.welcome')}
        </Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {profile?.username || profile?.email || '—'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
          {t('home.summary')}
        </Text>
        <Text style={[styles.amount, { color: theme.text }]}>
          {totalNet.toFixed(2)} €
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
          {t('home.traderShare')}
        </Text>
        <Text style={[styles.traderAmount, { color: theme.primary }]}>
          {traderShareTotal.toFixed(2)} €
        </Text>
        <Text style={[styles.days, { color: theme.textSecondary }]}>
          {t('home.traderShareDesc')} · {daysWithEntries} {t('home.daysRecorded')}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.miniLabel, { color: theme.textSecondary }]}>
            {t('home.gains')}
          </Text>
          <Text style={[styles.miniValue, { color: theme.success }]}>
            +{totalGains.toFixed(2)} €
          </Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.miniLabel, { color: theme.textSecondary }]}>
            {t('home.losses')}
          </Text>
          <Text style={[styles.miniValue, { color: theme.danger }]}>
            -{totalPertes.toFixed(2)} €
          </Text>
        </View>
      </View>

      <View style={[styles.info, { backgroundColor: theme.surface }]}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>
          {t('versement.rulesTitle')}
        </Text>
        <Text style={[styles.infoSub, { color: theme.textSecondary }]}>
          {t('versement.rulesDesc')}
        </Text>
      </View>

      {profile?.role === 'admin' && (
        <TouchableOpacity
          style={[styles.adminBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AdminUsers')}
        >
          <Text style={styles.adminBtnText}>{t('admin.open')}</Text>
        </TouchableOpacity>
      )}
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 24 },
  welcome: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700' },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  amount: { fontSize: 24, fontWeight: '700' },
  traderAmount: { fontSize: 28, fontWeight: '700' },
  days: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  miniCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  miniLabel: { fontSize: 12 },
  miniValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  info: { padding: 16, borderRadius: 16, marginTop: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoSub: { fontSize: 12, marginTop: 4 },
  adminBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  adminBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
