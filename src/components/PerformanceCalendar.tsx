import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Lundi -> Dimanche
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon -> Sun
const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatValue(net: number): string {
  if (net === 0) return '0,00 €';
  const abs = Math.abs(net);
  return `${net >= 0 ? '' : '-'}${abs.toFixed(2).replace('.', ',')} €`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 = Lundi, 6 = Dimanche (European)
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function PerformanceCalendar({
  month: initialMonth,
  year: initialYear,
}: {
  month?: number;
  year?: number;
} = {}) {
  const { theme } = useTheme();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const { t } = useLanguage();
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [dailyData, setDailyData] = useState<Record<string, number>>({});
  const [monthGains, setMonthGains] = useState(0);

  useEffect(() => {
    if (!user) return;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const fromStr = start.toISOString().slice(0, 10);
    const toStr = end.toISOString().slice(0, 10);

    supabase
      .from('versements')
      .select('date, gains, pertes')
      .eq('user_id', user.id)
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('date', { ascending: true })
      .then(({ data: raw }) => {
        const rows = (raw as { date: string; gains: number; pertes: number }[]) ?? [];
        const map: Record<string, number> = {};
        let gainsTotal = 0;
        rows.forEach((r) => {
          const gains = Number(r.gains);
          const net = Number(r.gains) - Number(r.pertes);
          gainsTotal += gains;
          map[r.date] = net;
        });
        setDailyData(map);
        setMonthGains(gainsTotal);
      });
  }, [user, year, month]);

  const monthNames = locale === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  const weekdays = locale === 'fr' ? WEEKDAYS_FR : WEEKDAYS_EN;
  const lastDay = getDaysInMonth(year, month);
  const firstWeekday = getFirstDayOfMonth(year, month);
  const totalEmpty = firstWeekday;
  const totalCells = totalEmpty + lastDay;
  const weeks = Math.ceil(totalCells / 7);

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
  const canGoNext = !isFutureMonth;

  const days: { day: number | null; dateStr: string | null; net: number }[] = [];
  for (let i = 0; i < totalEmpty; i++) {
    days.push({ day: null, dateStr: null, net: 0 });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, dateStr, net: dailyData[dateStr] ?? 0 });
  }
  while (days.length < weeks * 7) {
    days.push({ day: null, dateStr: null, net: 0 });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn} hitSlop={12}>
          <Text style={[styles.navText, { color: theme.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn} hitSlop={12} disabled={!canGoNext}>
          <Text style={[styles.navText, { color: canGoNext ? theme.primary : theme.textSecondary }]}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.gainRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.gainLabel, { color: theme.textSecondary }]}>{t('chart.monthTotalGains')}</Text>
        <Text style={[styles.gainValue, { color: theme.success }]}>
          +{monthGains.toFixed(2).replace('.', ',')} €
        </Text>
      </View>
      <View style={styles.weekRow}>
        {weekdays.map((wd, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: theme.textSecondary }]}>{wd}</Text>
          </View>
        ))}
      </View>
      {Array.from({ length: weeks }).map((_, weekIdx) => (
        <View key={weekIdx} style={styles.dayRow}>
          {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((item, colIdx) => {
            if (item.day === null) {
              return <View key={colIdx} style={styles.dayCell} />;
            }
            const isPos = item.net > 0;
            const isNeg = item.net < 0;
            const bg = isPos ? theme.successLight : isNeg ? theme.dangerLight : theme.surfaceVariant;
            return (
              <View key={colIdx} style={[styles.dayCell, { backgroundColor: bg }]}>
                <Text style={[styles.dayNum, { color: theme.text }]}>{item.day}</Text>
                <Text
                  style={[
                    styles.dayValue,
                    { color: isPos ? theme.success : isNeg ? theme.danger : theme.textSecondary },
                  ]}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {formatValue(item.net)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  navText: { fontSize: 28, fontWeight: '300' },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  gainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  gainLabel: { fontSize: 12 },
  gainValue: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: { fontSize: 11, fontWeight: '600' },
  dayRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  dayValue: {
    fontSize: 9,
    fontWeight: '600',
    width: '100%',
    textAlign: 'center',
    flexShrink: 1,
  },
});
