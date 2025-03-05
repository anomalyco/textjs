import { Fragment, useRef, type ReactNode } from "react";
import { useFocus } from "../focus";
import { useInput } from "../hooks";
import { useTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Text } from "./Text";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  /** Single key that activates the tab (e.g. `"1"`). */
  shortcut?: string;
}

export interface TabsProps extends Omit<BoxProps, "children" | "onChange" | "ref"> {
  tabs: ReadonlyArray<TabItem>;
  activeTab: string;
  onChange?: (id: string) => void;
  /** Left/Right switching while focused. */
  focused?: boolean;
  focusable?: boolean;
  autoFocus?: boolean;
  id?: string;
  /** Enable shortcut keys (default `true`). */
  shortcuts?: boolean;
  isActive?: boolean;
  /** `"underline"` (default) or `"pill"`. */
  variant?: "underline" | "pill";
}

/** A horizontal tab strip with keyboard switching and shortcut keys. */
export function Tabs(props: TabsProps): ReactNode {
  const {
    tabs,
    activeTab,
    onChange,
    focused,
    focusable = false,
    autoFocus,
    id,
    shortcuts = true,
    isActive = true,
    variant = "underline",
    ...boxProps
  } = props;
  const theme = useTheme();
  const focus = useFocus({ id, autoFocus, focused, isActive: focusable && isActive });
  const isFocused = focused ?? (focusable && focus.isFocused);
  const latest = useRef({ tabs, activeTab, onChange });
  latest.current = { tabs, activeTab, onChange };

  useInput(
    (e) => {
      const { tabs: list, activeTab: cur, onChange: change } = latest.current;
      if (list.length === 0 || !change) return;
      const idx = list.findIndex((t) => t.id === cur);
      if (isFocused && (e.key === "left" || e.key === "right") && !e.ctrl && !e.meta) {
        const next = (idx + (e.key === "left" ? -1 : 1) + list.length) % list.length;
        e.stopPropagation();
        change((list[next] as TabItem).id);
        return;
      }
      if (shortcuts && !e.ctrl && !e.meta && !e.alt && e.input.length > 0) {
        const hit = list.find((t) => t.shortcut !== undefined && t.shortcut.toLowerCase() === e.input.toLowerCase());
        if (hit) {
          e.stopPropagation();
          if (hit.id !== cur) change(hit.id);
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="row" height={1} flexShrink={0} {...boxProps}>
      {tabs.map((t, i) => {
        const on = t.id === activeTab;
        const pill = variant === "pill";
        return (
          <Fragment key={t.id}>
            {i > 0 ? <Text color={theme.border}>{pill ? " " : " │ "}</Text> : null}
            <Text
              wrap="nowrap"
              flexShrink={0}
              bold={on}
              underline={on && !pill && isFocused}
              color={on ? (pill ? theme.accentFg : theme.fg) : theme.subtle}
              bg={on && pill ? theme.accent : undefined}
            >
              {pill ? " " : ""}
              {t.shortcut ? <Text color={on ? (pill ? theme.accentFg : theme.accent) : theme.subtle} dim={!on}>{`${t.shortcut} `}</Text> : null}
              {t.label}
              {t.badge !== undefined ? <Text color={on ? theme.accent : theme.subtle}>{` ${t.badge}`}</Text> : null}
              {pill ? " " : ""}
            </Text>
          </Fragment>
        );
      })}
    </Box>
  );
}
