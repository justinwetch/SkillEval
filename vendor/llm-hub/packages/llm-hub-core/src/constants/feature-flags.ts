export const FEATURE_FLAGS = {
  experimentalBrowserSessionAdapters: 'experimentalBrowserSessionAdapters',
} as const;

export type FeatureFlagName =
  (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  experimentalBrowserSessionAdapters: false,
};
