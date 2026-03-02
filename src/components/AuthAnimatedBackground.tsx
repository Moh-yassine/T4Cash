import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CANDLE_WIDTH = 6;
const CANDLE_GAP = 3;
const CANDLE_TOTAL = CANDLE_WIDTH + CANDLE_GAP;
const CANDLE_COUNT = 80;
const CHART_WIDTH = CANDLE_COUNT * CANDLE_TOTAL;
const BASELINE_Y = SCREEN_HEIGHT * 0.5;

const COLORS_UP = ['#14B8A6', '#22C55E', '#10B981', '#2DD4BF'];
const COLORS_DOWN = ['#EF4444', '#F97316', '#E11D48', '#DC2626'];

type CandleData = {
  bodyHeight: number;
  upperWick: number;
  lowerWick: number;
  colorIndex: number;
  isUp: boolean;
};

function generateCandles(): CandleData[] {
  const candles: CandleData[] = [];
  const maxHeight = SCREEN_HEIGHT * 0.35;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const bodyHeight = 12 + Math.random() * Math.min(50, maxHeight);
    const upperWick = 6 + Math.random() * 20;
    const lowerWick = 6 + Math.random() * 20;
    const isUp = Math.random() > 0.48;
    candles.push({
      bodyHeight,
      upperWick,
      lowerWick,
      colorIndex: Math.floor(Math.random() * 4),
      isUp,
    });
  }
  return candles;
}

function CandleShape({
  candle,
  index,
  opacity,
}: {
  candle: CandleData;
  index: number;
  opacity: Animated.Value;
}) {
  const color = candle.isUp ? COLORS_UP[candle.colorIndex] : COLORS_DOWN[candle.colorIndex];
  const x = index * CANDLE_TOTAL;

  return (
    <Animated.View
      style={[
        styles.candleWrap,
        {
          left: x,
          bottom: BASELINE_Y - candle.bodyHeight / 2,
          opacity,
        },
      ]}
    >
      <View style={[styles.wick, { height: candle.upperWick, backgroundColor: color }]} />
      <View
        style={[
          styles.candleBody,
          {
            height: candle.bodyHeight,
            backgroundColor: color,
          },
        ]}
      />
      <View style={[styles.wick, { height: candle.lowerWick, backgroundColor: color }]} />
    </Animated.View>
  );
}

export function AuthAnimatedBackground() {
  const candles = useRef(generateCandles()).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -CHART_WIDTH,
          duration: 25000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(animate);
    };
    animate();
  }, [translateX]);

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Animated.View
          style={[
            styles.chartRow,
            {
              width: CHART_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        >
          {candles.map((candle, i) => (
            <CandleShape key={i} candle={candle} index={i} opacity={opacity} />
          ))}
        </Animated.View>
        <Animated.View
          style={[
            styles.chartRow,
            {
              width: CHART_WIDTH,
              left: CHART_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        >
          {candles.map((candle, i) => (
            <CandleShape key={`dup-${i}`} candle={candle} index={i} opacity={opacity} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1220',
    overflow: 'hidden',
  },
  chartContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  chartRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  candleWrap: {
    position: 'absolute',
    width: CANDLE_WIDTH,
    left: 0,
    alignItems: 'center',
  },
  candleBody: {
    width: CANDLE_WIDTH - 1,
    borderRadius: 1,
  },
  wick: {
    width: 1,
    borderRadius: 0.5,
    alignSelf: 'center',
  },
});
