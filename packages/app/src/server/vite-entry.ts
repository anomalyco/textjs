import { mergeConfig, type InlineConfig, type Rollup } from "vite";

/**
 * Merge the app's `vite` config into a framework build, then pin the build's
 * entry. A user `build.rollupOptions.input` (or `build.ssr` entry) belongs to
 * the client build and must not replace a framework bundle's virtual entry.
 */
export function withFrameworkEntry(config: InlineConfig, user: Record<string, unknown> | undefined, entry: { input: Rollup.InputOption; ssr?: true }): InlineConfig {
  const merged = user ? mergeConfig(config, user) : config;
  return {
    ...merged,
    build: {
      ...merged.build,
      ...(entry.ssr ? { ssr: true } : {}),
      rollupOptions: { ...merged.build?.rollupOptions, input: entry.input },
    },
  };
}
