import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_IMAGE = require('../../assets/auth-bg.png');
const LOGO_IMAGE = require('../../assets/logo-T4Cash.png');

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
};

export function AuthLayout({ children, scroll = true }: Props) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoContainer}>
        <Image
          source={LOGO_IMAGE}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey="auth-logo"
          priority="high"
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        {children}
      </KeyboardAvoidingView>
    </ScrollView>
  ) : (
    <>
      <View style={styles.logoContainer}>
        <Image
          source={LOGO_IMAGE}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey="auth-logo"
          priority="high"
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        {children}
      </KeyboardAvoidingView>
    </>
  );

  return (
    <View style={styles.background}>
      <ImageBackground
        source={BG_IMAGE}
        style={styles.bgWrapper}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.inner}>{content}</View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgWrapper: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    minWidth: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logo: {
    width: 260,
    height: 260,
  },
  keyboard: { flexGrow: 0 },
});
