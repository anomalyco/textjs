import { mergeConfig, type InlineConfig, type Rollup } from "vite";

/**
 * Merge the app's `vite` config into a framework build, then pin the build's
 * entry and `emptyOutDir`. A user `build.rollupOptions.input` (or `build.ssr`
 * entry) belongs to the client build and must not replace a framework bundle's
 * virtual entry, and a user `build.emptyOutDir` applies once, at the start of
 * `text build`, not to every bundle written into the output afterwards.
 */
export function withFrameworkEntry(config: InlineConfig, user: Record<string, unknown> | undefined, entry: { input: Rollup.InputOption; ssr?: true }): InlineConfig {
  const merged = user ? mergeConfig(config, user) : config;
  return {
    ...merged,
    build: {
      ...merged.build,
      emptyOutDir: config.build?.emptyOutDir ?? false,
      ...(entry.ssr ? { ssr: true } : {}),
      rollupOptions: { ...merged.build?.rollupOptions, input: entry.input },
    },
  };
}
