const isEnabled = (value: unknown) => value === 'true';

export const featureFlags = {
  experimentalStoreFeatures: isEnabled(
    import.meta.env.VITE_EXPERIMENTAL_STORE_FEATURES,
  ),
};
