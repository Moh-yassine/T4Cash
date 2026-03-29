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
import { TraderPaymentPanel } from '../components/TraderPaymentPanel';
import { getTraderShare, isWorkingDay } from '../constants/trading';

function parseAmount(input: string): number {
  const normalized = input.replace(',', '.').trim();
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

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
    const g = parseAmount(gains);
    const p = parseAmount(pertes);
    const nextGains = (todayEntry?.gains ?? 0) + g;
    const nextPertes = (todayEntry?.pertes ?? 0) + p;
    setLoading(true);
    const { error } = await supabase.from('versements').upsert(
      {
        user_id: user.id,
        date: todayStr,
        gains: nextGains,
        pertes: nextPertes,
      },
      { onConflict: 'user_id,date' }
    );
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error.message);
    else {
      setTodayEntry({ gains: nextGains, pertes: nextPertes });
      setGains('');
      setPertes('');
      Alert.alert(t('common.ok'), t('versement.saved'));
    }
  };

  const net = parseAmount(gains) - parseAmount(pertes);
  const traderPart = getTraderShare(net);

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

        <TraderPaymentPanel />
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
  previewText: { fontSize: 14, fontWeight: '600' },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
