import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AnimatedScreen } from '../components/AnimatedScreen';

export function ProfileScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setEmail(profile?.email ?? user?.email ?? '');
    setAddress(profile?.address ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile, user]);

  const pickImage = async (useCamera: boolean) => {
    if (!user) return;
    if (Platform.OS === 'web') {
      useCamera = false;
    }
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Permission requise pour accéder aux photos.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setAvatarUrl(uri);

    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`, upsert: true });

      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);
    } catch (e) {
      console.warn('Avatar upload:', e);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username || null,
        email: email || null,
        address: address || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) Alert.alert(t('common.error'), error.message);
    else {
      await refreshProfile();
      Alert.alert('OK', 'Profil enregistré.');
    }
  };

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[
              styles.avatarWrap,
              { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
            ]}
            onPress={() => {
              if (Platform.OS === 'web') {
                pickImage(false);
              } else {
                Alert.alert(t('profile.changeAvatar'), '', [
                  { text: t('profile.takePhoto'), onPress: () => pickImage(true) },
                  { text: t('profile.choosePhoto'), onPress: () => pickImage(false) },
                  { text: t('common.cancel'), style: 'cancel' },
                ]);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatarInner}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={48} color={theme.textSecondary} />
              )}
            </View>
            <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>
            {t('profile.changeAvatar')}
          </Text>
        </View>

        <View style={[styles.field, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('profile.username')}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('profile.username')}
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={[styles.field, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('profile.email')}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder={t('profile.email')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={[styles.field, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('profile.address')}
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder={t('profile.address')}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('profile.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignSelf: 'center', alignItems: 'center', marginBottom: 24 },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { fontSize: 12, marginTop: 8 },
  avatarPlaceholder: { fontSize: 32, fontWeight: '700' },
  field: { padding: 16, borderRadius: 12, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
