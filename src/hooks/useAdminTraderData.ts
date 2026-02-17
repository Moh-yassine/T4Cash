import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export type AdminUserBalance = {
  user_id: string;
  email: string | null;
  username: string | null;
  total_due: number;
  total_paid: number;
  remaining: number;
};

export type AdminPaymentHistoryRow = {
  payment_id: string;
  paid_at: string;
  amount: number;
  created_at: string;
};

export function useAdminTraderData() {
  const [users, setUsers] = useState<AdminUserBalance[]>([]);
  const [historyByUser, setHistoryByUser] = useState<Record<string, AdminPaymentHistoryRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingHistoryFor, setLoadingHistoryFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('admin_list_user_trader_balances');
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = ((data as unknown as AdminUserBalance[]) ?? []).map((row) => ({
      ...row,
      total_due: Number(row.total_due ?? 0),
      total_paid: Number(row.total_paid ?? 0),
      remaining: Number(row.remaining ?? 0),
    }));
    setUsers(rows);
  }, []);

  const fetchHistory = useCallback(async (userId: string) => {
    setLoadingHistoryFor(userId);
    const payload = { target_user_id: userId } as unknown as never;
    const { data, error } = await supabase.rpc('admin_get_user_payment_history', payload);
    setLoadingHistoryFor(null);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = ((data as unknown as AdminPaymentHistoryRow[]) ?? []).map((row) => ({
      ...row,
      amount: Number(row.amount ?? 0),
    }));
    setHistoryByUser((prev) => ({ ...prev, [userId]: rows }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  return {
    users,
    historyByUser,
    loading,
    loadingHistoryFor,
    error,
    refresh: fetchUsers,
    fetchHistory,
  };
}
