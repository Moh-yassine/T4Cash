import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getWorkingDaysInMonth,
  getObjectifMensuel,
  getTraderShare,
} from '../constants/trading';

export type VersementRow = { date: string; gains: number; pertes: number };

export function useVersementStats() {
  const { user } = useAuth();
  const [versements, setVersements] = useState<VersementRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const fromStr = from.toISOString().slice(0, 10);

    const fetch = () => {
      supabase
        .from('versements')
        .select('date, gains, pertes')
        .eq('user_id', user.id)
        .gte('date', fromStr)
        .order('date', { ascending: true })
        .then(({ data }) => setVersements((data as VersementRow[]) ?? []));
    };

    fetch();

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
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const {
    totalGains,
    totalPertes,
    totalNet,
    workingDaysInMonth,
    objectifMensuel,
    traderShareTotal,
    daysWithEntries,
  } = useMemo(() => {
    const totalGains = versements.reduce((s, v) => s + Number(v.gains), 0);
    const totalPertes = versements.reduce((s, v) => s + Number(v.pertes), 0);
    const totalNet = totalGains - totalPertes;
    const workingDaysInMonth = getWorkingDaysInMonth(year, month);
    const objectifMensuel = getObjectifMensuel(year, month);
    const traderShareTotal = versements.reduce((sum, v) => {
      const net = Number(v.gains) - Number(v.pertes);
      return sum + getTraderShare(net);
    }, 0);
    const daysWithEntries = versements.length;
    return {
      totalGains,
      totalPertes,
      totalNet,
      workingDaysInMonth,
      objectifMensuel,
      traderShareTotal,
      daysWithEntries,
    };
  }, [versements, year, month]);

  return {
    versements,
    totalGains,
    totalPertes,
    totalNet,
    workingDaysInMonth,
    objectifMensuel,
    traderShareTotal,
    daysWithEntries,
  };
}
