import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getTraderShare } from '../constants/trading';

type VersementForTrader = { gains: number; pertes: number };
type TraderPaymentRow = { id: string; amount: number; paid_at: string };

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

export function useTraderBalance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [payments, setPayments] = useState<TraderPaymentRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [versementsRes, paymentsRes] = await Promise.all([
      supabase
        .from('versements')
        .select('gains, pertes')
        .eq('user_id', user.id),
      supabase
        .from('trader_payments')
        .select('id, amount, paid_at')
        .eq('user_id', user.id)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    const versements = (versementsRes.data as VersementForTrader[]) ?? [];
    const traderPayments = (paymentsRes.data as TraderPaymentRow[]) ?? [];

    const dueCents = versements.reduce((sum, row) => {
      const net = Number(row.gains) - Number(row.pertes);
      return sum + toCents(getTraderShare(net));
    }, 0);
    const paidCents = traderPayments.reduce((sum, row) => sum + toCents(Number(row.amount)), 0);

    const due = fromCents(dueCents);
    const paid = fromCents(paidCents);
    setTotalDue(due);
    setTotalPaid(paid);
    setRemaining(Math.max(0, fromCents(dueCents - paidCents)));
    setPayments(traderPayments.map((row) => ({ ...row, amount: Number(row.amount) })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const addPayment = useCallback(async (amount: number, paidAt: string) => {
    if (!user) return { error: 'NO_USER' };
    setSaving(true);
    const payload = {
      user_id: user.id,
      amount,
      paid_at: paidAt,
    } as unknown as never;
    const { error } = await supabase.from('trader_payments').insert(payload);
    setSaving(false);
    if (error) return { error: error.message };
    await fetchData();
    return { error: null as string | null };
  }, [user, fetchData]);

  return {
    loading,
    saving,
    totalDue,
    totalPaid,
    remaining,
    payments,
    addPayment,
  };
}
