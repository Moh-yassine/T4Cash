import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function AppStripeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider publishableKey={stripePublishableKey} urlScheme="t4cash">
      {children}
    </StripeProvider>
  );
}
