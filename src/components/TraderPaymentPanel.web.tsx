import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
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
const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

function PaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
  theme,
  t,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  theme: { primary: string };
  t: (key: string) => string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      if (typeof window !== 'undefined') window.alert('Stripe non chargé. Réessayez.');
      return;
    }
    if (!elementReady) {
      if (typeof window !== 'undefined') window.alert('Formulaire en cours de chargement...');
      return;
    }

    setLoading(true);
    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname || '/'}${window.location.hash || ''}`
          : '';

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        if (typeof window !== 'undefined') {
          window.alert(error.message ?? 'Erreur de paiement');
        }
      } else {
        onSuccess();
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.alert(err instanceof Error ? err.message : 'Erreur lors du paiement');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyles.form}>
      <div style={{ ...formStyles.elementWrapper, minHeight: 220 }}>
        {loadError ? (
          <div style={formStyles.error}>{loadError}</div>
        ) : (
          <PaymentElement
            onReady={() => setElementReady(true)}
            onLoadError={(e) => {
            const msg = (e as { error?: { message?: string } })?.error?.message ?? 'Erreur chargement Stripe';
            const isKeyMismatch = msg.includes('client_secret') || msg.includes('PaymentIntent') || msg.includes('publishable key');
            setLoadError(isKeyMismatch
              ? 'Clés Stripe incorrectes : la clé publique (app) et la clé secrète (Supabase) doivent être du même compte. Voir docs/CONFIG-STRIPE.md'
              : msg);
          }}
            options={{
              layout: 'tabs',
              wallets: { applePay: 'never', googlePay: 'never' },
            }}
          />
        )}
      </div>
      <div style={formStyles.buttons}>
        <button
          type="button"
          onClick={onCancel}
          style={formStyles.btnSecondary}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || loading || !elementReady || !!loadError}
          style={{
            ...formStyles.btnPrimary,
            backgroundColor: theme.primary,
            opacity: !stripe || loading || !elementReady || loadError ? 0.5 : 1,
          }}
        >
          {loading ? t('common.loading') : `Payer ${amount.toFixed(2)} €`}
        </button>
      </div>
    </form>
  );
}

const formStyles: Record<string, React.CSSProperties> = {
  form: { marginTop: 16 },
  elementWrapper: {
    marginBottom: 20,
    padding: '16px 0',
  },
  error: {
    color: '#e74c3c',
    padding: 12,
    background: 'rgba(231,76,60,0.1)',
    borderRadius: 8,
  },
  buttons: { display: 'flex', flexDirection: 'row' as const, alignItems: 'center', gap: 12 },
  btnPrimary: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: 12,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '14px 20px',
    borderRadius: 12,
    border: '1px solid #666',
    background: 'transparent',
    color: '#999',
    fontSize: 14,
    cursor: 'pointer',
  },
};

export function TraderPaymentPanel() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const { loading, saving, remaining, refresh, addPayment } = useTraderBalance();
  const [expanded, setExpanded] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [stripePaying, setStripePaying] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const paymentIntentIdRef = useRef<string | null>(null);
  const handledRedirect = useRef(false);
  const navigation = useNavigation();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleSuccessModalDismiss = useCallback(() => {
    setShowSuccessModal(false);
    (navigation as any).navigate('Home');
  }, [navigation]);

  const recordPaymentFromStripe = useCallback(
    async (piId: string | null): Promise<{ ok: boolean; error?: string }> => {
      if (!piId || !session?.access_token || !SUPABASE_URL) return { ok: false, error: 'Paramètres manquants' };
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/record-stripe-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paymentIntentId: piId }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? `Erreur ${res.status}` };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau' };
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || handledRedirect.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect_status') === 'succeeded') {
      handledRedirect.current = true;
      const piId = sessionStorage.getItem('t4cash_last_payment_intent');
      const amountStr = sessionStorage.getItem('t4cash_last_payment_amount');
      sessionStorage.removeItem('t4cash_last_payment_intent');
      sessionStorage.removeItem('t4cash_last_payment_amount');
      if (piId) {
        recordPaymentFromStripe(piId).then(async (result) => {
          if (!result.ok && amountStr) {
            const amount = parseAmount(amountStr);
            if (amount > 0) await addPayment(amount, todayStr);
          }
          refresh();
          setTimeout(() => refresh(), 1000);
          setTimeout(() => refresh(), 2500);
          setShowSuccessModal(true);
        });
      } else {
        refresh();
        setTimeout(() => refresh(), 1000);
        setTimeout(() => refresh(), 2500);
        setShowSuccessModal(true);
      }
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }, [refresh, t, recordPaymentFromStripe, addPayment, todayStr]);

  const onPayWithStripe = async () => {
    const amount = parseAmount(amountInput);
    if (amount <= 0) {
      if (typeof window !== 'undefined') window.alert(t('versement.paymentInvalid'));
      return;
    }
    const token = session?.access_token;
    if (!token) {
      if (typeof window !== 'undefined') window.alert('Session expirée. Reconnectez-vous.');
      return;
    }
    if (!SUPABASE_URL) {
      if (typeof window !== 'undefined') window.alert('Configuration manquante.');
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

      let data: { clientSecret?: string; paymentIntentId?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error('Erreur serveur. Les Edge Functions sont-elles déployées ?');
      }
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      const secret = data.clientSecret;
      if (!secret) throw new Error('Client secret manquant');

      const piIdFromSecret = secret.includes('_secret_') ? secret.split('_secret_')[0] : null;
      const piId = data.paymentIntentId ?? piIdFromSecret ?? null;
      paymentIntentIdRef.current = piId;
      if (typeof window !== 'undefined') {
        if (piId) sessionStorage.setItem('t4cash_last_payment_intent', piId);
        sessionStorage.setItem('t4cash_last_payment_amount', String(amount));
      }
      setClientSecret(secret);
      setPayAmount(amount);
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.alert(err instanceof Error ? err.message : 'Erreur');
      }
    } finally {
      setStripePaying(false);
    }
  };

  const handlePaymentSuccess = async () => {
    const piId = paymentIntentIdRef.current;
    let recorded = false;
    if (piId) {
      const result = await recordPaymentFromStripe(piId);
      recorded = result.ok;
      paymentIntentIdRef.current = null;
      if (!result.ok && payAmount > 0) {
        const { error } = await addPayment(payAmount, todayStr);
        if (!error) recorded = true;
      }
    } else if (payAmount > 0) {
      const { error } = await addPayment(payAmount, todayStr);
      if (!error) recorded = true;
    }
    setClientSecret(null);
    setAmountInput('');
    refresh();
    setTimeout(() => refresh(), 1000);
    setTimeout(() => refresh(), 2500);
    setShowSuccessModal(true);
  };

  const handlePaymentCancel = () => setClientSecret(null);

  const options = useMemo(
    () =>
      clientSecret
        ? { clientSecret, appearance: { theme: 'night' as const, variables: { colorPrimary: theme.primary } } }
        : {},
    [clientSecret, theme.primary]
  );

  return (
    <>
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
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
          ) : clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm
                clientSecret={clientSecret}
                amount={payAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                theme={theme}
                t={t}
              />
            </Elements>
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
              <button
                type="button"
                onClick={onPayWithStripe}
                disabled={saving || stripePaying}
                style={{
                  ...formStyles.btnPrimary,
                  backgroundColor: theme.primary,
                  marginTop: 12,
                  opacity: saving || stripePaying ? 0.6 : 1,
                }}
              >
                {stripePaying ? t('common.loading') : t('versement.payWithCard')}
              </button>
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
});
