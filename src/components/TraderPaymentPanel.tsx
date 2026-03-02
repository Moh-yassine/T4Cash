import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTraderBalance } from '../hooks/useTraderBalance';
import { PaymentSuccessModal } from './PaymentSuccessModal';
function parseAmount(input: string): number {
  const normalized = input.replace(',', '.').trim();
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export function TraderPaymentPanel() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const navigation = useNavigation();
  const { loading, saving, remaining, refresh, addPayment } = useTraderBalance();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [expanded, setExpanded] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [stripePaying, setStripePaying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSuccessModalDismiss = useCallback(() => {
    setShowSuccessModal(false);
    (navigation as any).navigate('Home');
  }, [navigation]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const onPayWithStripe = async () => {
    const amount = parseAmount(amountInput);
    if (amount <= 0) {
      Alert.alert(t('common.error'), t('versement.paymentInvalid'));
      return;
    }

    const token = session?.access_token;
    if (!token) {
      Alert.alert(t('common.error'), 'Session expirée. Reconnectez-vous.');
      return;
    }

    setStripePaying(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Erreur serveur');
      }

      const { clientSecret, paymentIntentId } = data;
      if (!clientSecret) throw new Error('Client secret manquant');

      const piIdFromSecret = clientSecret.includes('_secret_') ? clientSecret.split('_secret_')[0] : null;
      const piId = paymentIntentId ?? piIdFromSecret;

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'T4Cash',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') return;
        throw new Error(presentError.message);
      }

      let recorded = false;
      if (piId && token) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/record-stripe-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentIntentId: piId }),
          });
          const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          recorded = res.ok === true;
          if (!recorded && amount > 0) {
            const { error } = await addPayment(amount, todayStr);
            if (!error) recorded = true;
          }
        } catch {
          if (amount > 0) {
            const { error } = await addPayment(amount, todayStr);
            if (!error) recorded = true;
          }
        }
      } else if (amount > 0) {
        const { error } = await addPayment(amount, todayStr);
        if (!error) recorded = true;
      }

      setAmountInput('');
      await refresh();
      setTimeout(() => refresh(), 1000);
      setTimeout(() => refresh(), 2500);
      setShowSuccessModal(true);
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Erreur lors du paiement'
      );
    } finally {
      setStripePaying(false);
    }
  };

  return (
    <>
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
                onPress={onPayWithStripe}
                disabled={saving || stripePaying}
              >
                {stripePaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('versement.payWithCard')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
    <PaymentSuccessModal
      visible={showSuccessModal}
      onDismiss={handleSuccessModalDismiss}
      title={t('versement.paymentSuccessTitle')}
      subtitle={t('versement.paymentSaved')}
      buttonLabel={t('versement.backToHome')}
      autoRedirectDelayMs={2500}
    />
    </>
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
  buttonSecondary: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: { fontSize: 14, fontWeight: '600' },
});
