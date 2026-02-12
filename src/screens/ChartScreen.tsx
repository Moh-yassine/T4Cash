import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { getTraderShare, INITIAL_CAPITAL_EUR } from '../constants/trading';

type Period = 'day' | 'week' | 'month' | 'year';
type ViewMode = 'capital' | 'pnl';

export function ChartScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('capital');
  const [data, setData] = useState<{ date: string; net: number; cumul: number; gains: number; pertes: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const to = new Date();
    const from = new Date();
    if (period === 'day') from.setDate(to.getDate() - 7);
    else if (period === 'week') from.setDate(to.getDate() - 14);
    else if (period === 'month') from.setMonth(to.getMonth() - 1);
    else from.setFullYear(to.getFullYear() - 1);
    const fromStr = from.toISOString().slice(0, 10);

    supabase
      .from('versements')
      .select('date, gains, pertes')
      .eq('user_id', user.id)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .then(({ data: raw }) => {
        const rows = (raw as { date: string; gains: number; pertes: number }[]) ?? [];
        let cumul = 0;
        const points = rows.map((r) => {
          const g = Number(r.gains);
          const p = Number(r.pertes);
          const net = g - p;
          cumul += net;
          return { date: r.date, net, cumul, gains: g, pertes: p };
        });
        setData(points);
      });
  }, [user, period]);

  const {
    capitalData,
    barData,
    currentCapital,
    returnPercent,
    totalGains,
    totalPertes,
    traderSharePeriod,
    chartWidth,
  } = useMemo(() => {
    if (!data.length) {
      const w = Dimensions.get('window').width - 48;
      return {
        capitalData: [],
        barData: [],
        currentCapital: INITIAL_CAPITAL_EUR,
        returnPercent: 0,
        totalGains: 0,
        totalPertes: 0,
        traderSharePeriod: 0,
        chartWidth: w,
      };
    }
    const totalNet = data[data.length - 1].cumul;
    const currentCapital = INITIAL_CAPITAL_EUR + totalNet;
    const returnPercent = (totalNet / INITIAL_CAPITAL_EUR) * 100;
    const totalGains = data.reduce((s, d) => s + d.gains, 0);
    const totalPertes = data.reduce((s, d) => s + d.pertes, 0);
    const traderSharePeriod = data.reduce((sum, d) => sum + getTraderShare(d.net), 0);

    const capitalData = [
      { value: INITIAL_CAPITAL_EUR, label: '', dataPointText: `${INITIAL_CAPITAL_EUR}€` },
      ...data.map((d) => ({
        value: INITIAL_CAPITAL_EUR + d.cumul,
        label: period === 'day' || period === 'week' ? d.date.slice(5) : d.date.slice(0, 7),
        dataPointText: `${(INITIAL_CAPITAL_EUR + d.cumul).toFixed(0)}€`,
      })),
    ];

    const barData = data.map((d) => ({
      value: d.net,
      label: period === 'day' || period === 'week' ? d.date.slice(5) : d.date.slice(0, 7),
      frontColor: d.net >= 0 ? theme.success : theme.danger,
    }));

    const w = Dimensions.get('window').width - 48;
    return {
      capitalData,
      barData,
      currentCapital,
      returnPercent,
      totalGains,
      totalPertes,
      traderSharePeriod,
      chartWidth: w,
    };
  }, [data, period, theme.success, theme.danger]);

  const periods: { key: Period; label: string }[] = [
    { key: 'day', label: t('chart.day') },
    { key: 'week', label: t('chart.week') },
    { key: 'month', label: t('chart.month') },
    { key: 'year', label: t('chart.year') },
  ];

  const chartHeight = 220;

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.periodRow}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodBtn,
                { backgroundColor: period === p.key ? theme.primary : theme.surface, borderColor: theme.border },
              ]}
              onPress={() => setPeriod(p.key)}
            >
              <Text
                style={[styles.periodText, { color: period === p.key ? '#fff' : theme.text }]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.metricsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('chart.capital')}
              </Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {currentCapital.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('chart.return')}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: returnPercent >= 0 ? theme.success : theme.danger },
                ]}
              >
                {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)} %
              </Text>
            </View>
          </View>
          <View style={[styles.metricsDivider, { backgroundColor: theme.border }]} />
          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('chart.gains')}
              </Text>
              <Text style={[styles.metricValueSmall, { color: theme.success }]}>
                +{totalGains.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('chart.losses')}
              </Text>
              <Text style={[styles.metricValueSmall, { color: theme.danger }]}>
                -{totalPertes.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {t('chart.traderSharePeriod')}
              </Text>
              <Text style={[styles.metricValueSmall, { color: theme.primary }]}>
                {traderSharePeriod.toFixed(2)} €
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              { backgroundColor: viewMode === 'capital' ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={() => setViewMode('capital')}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'capital' ? '#fff' : theme.text },
              ]}
            >
              {t('chart.viewCapital')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              { backgroundColor: viewMode === 'pnl' ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={() => setViewMode('pnl')}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'pnl' ? '#fff' : theme.text },
              ]}
            >
              {t('chart.viewPnl')}
            </Text>
          </TouchableOpacity>
        </View>

        {data.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.chartTitle, { color: theme.textSecondary }]}>
              {viewMode === 'capital'
                ? t('chart.capitalEvolution')
                : t('chart.dailyPnl')}
            </Text>
            {Platform.OS === 'web' ? (
              <View style={[styles.webChartPlaceholder, { backgroundColor: theme.surface }]}>
                <Text style={[styles.webChartText, { color: theme.textSecondary }]}>
                  {viewMode === 'capital'
                    ? capitalData.map((p) => `${p.value?.toFixed(0)}€`).join(' → ')
                    : barData.map((p) => `${p.label}: ${p.value >= 0 ? '+' : ''}${p.value}€`).join(' · ')}
                </Text>
                <Text style={[styles.webChartCapital, { color: theme.text }]}>
                  {currentCapital.toFixed(2)} € ({returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(1)} %)
                </Text>
              </View>
            ) : viewMode === 'capital' && capitalData.length > 1 ? (
              <LineChart
                data={capitalData}
                width={chartWidth}
                height={chartHeight}
                color={currentCapital >= INITIAL_CAPITAL_EUR ? theme.success : theme.danger}
                thickness={2}
                hideDataPoints={capitalData.length > 10}
                noOfSections={4}
                areaChart
                startFillColor={currentCapital >= INITIAL_CAPITAL_EUR ? theme.success : theme.danger}
                endFillColor={currentCapital >= INITIAL_CAPITAL_EUR ? theme.success : theme.danger}
                startOpacity={0.35}
                endOpacity={0.05}
                xAxisColor={theme.textSecondary}
                yAxisColor={theme.textSecondary}
                backgroundColor="transparent"
                initialSpacing={20}
                endSpacing={20}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                rulesColor={theme.chartGrid}
              />
            ) : viewMode === 'pnl' && barData.length > 0 ? (
              <BarChart
                data={barData}
                width={chartWidth}
                height={chartHeight}
                barWidth={Math.max(12, (chartWidth - 60) / barData.length - 4)}
                noOfSections={4}
                xAxisColor={theme.textSecondary}
                yAxisColor={theme.textSecondary}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                hideRules={false}
                rulesColor={theme.chartGrid}
                barBorderRadius={4}
                showVerticalLines={false}
                initialSpacing={20}
                endSpacing={20}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {t('chart.noData')}
                </Text>
              </View>
            )}
            <View style={[styles.chartLegend, { borderTopColor: theme.border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                  {t('chart.gains')}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                  {t('chart.losses')}
                </Text>
              </View>
              <Text style={[styles.legendCapital, { color: theme.textSecondary }]}>
                {t('chart.initialCapital')} : {INITIAL_CAPITAL_EUR} €
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.empty, { backgroundColor: theme.surface }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('chart.noData')}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {t('chart.noDataHint')}
            </Text>
          </View>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodText: { fontSize: 12, fontWeight: '600' },
  metricsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBlock: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricValueSmall: { fontSize: 14, fontWeight: '700' },
  metricsDivider: { height: 1, marginVertical: 12 },
  viewModeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModeText: { fontSize: 13, fontWeight: '600' },
  chartCard: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  emptyChart: { height: 220, justifyContent: 'center', alignItems: 'center' },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  legendCapital: { fontSize: 11, marginLeft: 'auto' },
  empty: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubtext: { fontSize: 12, marginTop: 8 },
  webChartPlaceholder: { padding: 20, borderRadius: 12 },
  webChartText: { fontSize: 12, marginBottom: 8 },
  webChartCapital: { fontSize: 18, fontWeight: '700' },
});
