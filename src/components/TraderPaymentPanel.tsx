import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTraderBalance } from '../hooks/useTraderBalance';

function parseAmount(input: string): number {
  const normalized = input.replace(',', '.').trim();
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function TraderPaymentPanel() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { loading, saving, remaining, addPayment } = useTraderBalance();
  const [expanded, setExpanded] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const onPay = async () => {
    const amount = parseAmount(amountInput);
    if (amount <= 0) {
      Alert.alert(t('common.error'), t('versement.paymentInvalid'));
      return;
    }
    const { error } = await addPayment(amount, todayStr);
    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }
    setAmountInput('');
    Alert.alert(t('common.ok'), t('versement.paymentSaved'));
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]}>{t('versement.paymentPanelTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('versement.remainingToPay')} {remaining.toFixed(2)} €
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <View style={[styles.row, { borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('versement.remainingToPay')}</Text>
                <Text style={[styles.value, { color: theme.primary }]}>{remaining.toFixed(2)} €</Text>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('versement.paidAmount')}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={onPay}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('versement.recordPayment')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  chevron: { fontSize: 14, fontWeight: '700' },
  content: { marginTop: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: '700' },
  inputLabel: { fontSize: 12, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
