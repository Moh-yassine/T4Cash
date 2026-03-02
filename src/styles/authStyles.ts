import * as ReactNative from 'react-native';

const _styles = ReactNative.StyleSheet.create({
  header: { marginBottom: 24, alignItems: 'center' as const },
  title: { fontSize: 26, fontWeight: '700' as const, color: '#FFFFFF' },
  subtitle: {
    fontSize: 14,
    color: '#E2E8F0',
    marginTop: 8,
    textAlign: 'center' as const,
    paddingHorizontal: 16,
  },
  form: {
    backgroundColor: 'rgba(18, 28, 45, 0.92)',
    borderRadius: 24,
    padding: 26,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  input: {
    backgroundColor: 'rgba(8, 12, 22, 0.95)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  inputLast: { marginBottom: 24 },
  forgotLink: { alignSelf: 'flex-end' as const, marginBottom: 16 },
  forgotText: { fontSize: 13, color: '#2DD4BF', fontWeight: '500' as const },
  buttonWrap: { overflow: 'hidden' as const, borderRadius: 14 },
  button: {
    padding: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  link: { alignItems: 'center' as const },
  linkText: { fontSize: 14, color: '#E2E8F0' },
  linkHighlight: { color: '#2DD4BF', fontWeight: '600' as const },
});

export const authStyles = _styles;
export const AUTH_GRADIENT_COLORS = ['#0D9488', '#2DD4BF', '#10B981'] as const;
export const AUTH_PLACEHOLDER_COLOR = '#94A3B8';
