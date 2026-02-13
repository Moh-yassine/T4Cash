import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useVersementStats } from '../hooks/useVersementStats';

import { OBJECTIF_QUOTIDIEN_EUR } from '../constants/trading';

export function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const {
    totalNet,
    objectifMensuel,
    traderShareTotal,
    workingDaysInMonth,
    totalGains,
    totalPertes,
    daysWithEntries,
  } = useVersementStats();

  const progressPercent = objectifMensuel > 0
    ? Math.min(100, (totalNet / objectifMensuel) * 100)
    : 0;

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
        <View style={[styles.barBg, { backgroundColor: theme.surfaceVariant }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: progressPercent >= 100 ? theme.success : theme.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.amount, { color: theme.text }]}>
          {totalNet.toFixed(2)} € / {objectifMensuel.toFixed(0)} €
        </Text>
        <Text style={[styles.objective, { color: theme.textSecondary }]}>
          {t('home.objectiveDaily')} {OBJECTIF_QUOTIDIEN_EUR} € · {workingDaysInMonth} {t('home.workingDays')}
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
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  amount: { fontSize: 24, fontWeight: '700' },
  objective: { fontSize: 12, marginTop: 4 },
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
});
