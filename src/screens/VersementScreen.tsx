import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { OBJECTIF_QUOTIDIEN_EUR, getTraderShare, isWorkingDay } from '../constants/trading';

export function VersementScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [gains, setGains] = useState('');
  const [pertes, setPertes] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<{ gains: number; pertes: number } | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const isTodayWorking = isWorkingDay(today);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('versements')
      .select('gains, pertes')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .single()
      .then(({ data }) => {
        if (data) setTodayEntry({ gains: Number(data.gains), pertes: Number(data.pertes) });
      });
  }, [user, todayStr]);

  const handleSave = async () => {
    if (!user) return;
    const g = parseFloat(gains) || 0;
    const p = parseFloat(pertes) || 0;
    setLoading(true);
    const { error } = await supabase.from('versements').upsert(
      {
        user_id: user.id,
        date: todayStr,
        gains: g,
        pertes: p,
      },
      { onConflict: 'user_id,date' }
    );
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error.message);
    else {
      setTodayEntry({ gains: g, pertes: p });
      setGains('');
      setPertes('');
      Alert.alert(t('common.ok'), t('versement.saved'));
    }
  };

  const net = (parseFloat(gains) || 0) - (parseFloat(pertes) || 0);
  const traderPart = getTraderShare(net);
  const dayProgress = Math.min(100, (net / OBJECTIF_QUOTIDIEN_EUR) * 100);

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
            {t('versement.daily')}
          </Text>
          <Text style={[styles.date, { color: theme.text }]}>{todayStr}</Text>
          {!isTodayWorking && (
            <Text style={[styles.weekendNote, { color: theme.warning }]}>
              {t('versement.weekendNote')}
            </Text>
          )}

          <View style={[styles.objectiveBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.objectiveLabel, { color: theme.textSecondary }]}>
              {t('versement.dailyObjective')}
            </Text>
            <Text style={[styles.objectiveValue, { color: theme.text }]}>
              {OBJECTIF_QUOTIDIEN_EUR} €
            </Text>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('versement.gains')}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={gains}
            onChangeText={setGains}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('versement.pertes')}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={pertes}
            onChangeText={setPertes}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
          />

          {(gains !== '' || pertes !== '') && (
            <View style={[styles.preview, { backgroundColor: theme.surfaceVariant }]}>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${dayProgress}%`,
                      backgroundColor: net >= OBJECTIF_QUOTIDIEN_EUR ? theme.success : theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.previewText, { color: theme.text }]}>
                {t('versement.netDay')} : {net.toFixed(2)} €
              </Text>
              <Text style={[styles.previewText, { color: theme.primary }]}>
                {t('versement.toPayTrader')} : {traderPart.toFixed(2)} €
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('versement.add')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.info, { backgroundColor: theme.surface }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {t('versement.rulesTitle')}
          </Text>
          <Text style={[styles.infoSub, { color: theme.textSecondary }]}>
            {t('versement.rulesDesc')}
          </Text>
          {todayEntry !== null && (
            <Text style={[styles.saved, { color: theme.success }]}>
              {t('versement.todaySaved')} +{todayEntry.gains.toFixed(2)} € / -{todayEntry.pertes.toFixed(2)} €
            </Text>
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  date: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  weekendNote: { fontSize: 12, marginBottom: 12 },
  objectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  objectiveLabel: { fontSize: 12 },
  objectiveValue: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
  },
  preview: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  previewText: { fontSize: 14, fontWeight: '600' },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { padding: 16, borderRadius: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoSub: { fontSize: 12, marginTop: 4 },
  saved: { fontSize: 12, marginTop: 8 },
});
