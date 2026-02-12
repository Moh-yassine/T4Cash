import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedScreen } from '../components/AnimatedScreen';

export function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, locale, setLocale } = useLanguage();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), 'Êtes-vous sûr ?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.theme')}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: themeMode === 'light' ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={() => setThemeMode('light')}
          >
            <Text
              style={[
                styles.optionText,
                { color: themeMode === 'light' ? '#fff' : theme.text },
              ]}
            >
              {t('settings.light')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: themeMode === 'dark' ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={() => setThemeMode('dark')}
          >
            <Text
              style={[
                styles.optionText,
                { color: themeMode === 'dark' ? '#fff' : theme.text },
              ]}
            >
              {t('settings.dark')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.language')}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: locale === 'fr' ? theme.primary : theme.surfaceVariant }]}
            onPress={() => setLocale('fr')}
          >
            <Text
              style={[
                styles.optionText,
                { color: locale === 'fr' ? '#fff' : theme.text },
              ]}
            >
              FR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: locale === 'en' ? theme.primary : theme.surfaceVariant }]}
            onPress={() => setLocale('en')}
          >
            <Text
              style={[
                styles.optionText,
                { color: locale === 'en' ? '#fff' : theme.text },
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logout, { backgroundColor: theme.danger }]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  option: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  optionText: { fontSize: 16, fontWeight: '600' },
  logout: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
