import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getTraderShare,
} from '../constants/trading';

export type VersementRow = { date: string; gains: number; pertes: number };

export function useVersementStats() {
  const { user } = useAuth();
  const [versements, setVersements] = useState<VersementRow[]>([]);
  const fetchVersements = useCallback(() => {
    if (!user) return;
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const fromStr = from.toISOString().slice(0, 10);

    supabase
      .from('versements')
      .select('date, gains, pertes')
      .eq('user_id', user.id)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .then(({ data }) => setVersements((data as VersementRow[]) ?? []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchVersements();

    const channel = supabase
      .channel('versements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'versements',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchVersements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchVersements]);

  useFocusEffect(
    useCallback(() => {
      fetchVersements();
    }, [fetchVersements])
  );

  const {
    totalGains,
    totalPertes,
    totalNet,
    traderShareTotal,
    daysWithEntries,
  } = useMemo(() => {
    const totalGains = versements.reduce((s, v) => s + Number(v.gains), 0);
    const totalPertes = versements.reduce((s, v) => s + Number(v.pertes), 0);
    const totalNet = totalGains - totalPertes;
    const traderShareTotal = versements.reduce((sum, v) => {
      const net = Number(v.gains) - Number(v.pertes);
      return sum + getTraderShare(net);
    }, 0);
    const daysWithEntries = versements.length;
    return {
      totalGains,
      totalPertes,
      totalNet,
      traderShareTotal,
      daysWithEntries,
    };
  }, [versements]);

  return {
    versements,
    totalGains,
    totalPertes,
    totalNet,
    traderShareTotal,
    daysWithEntries,
  };
}
