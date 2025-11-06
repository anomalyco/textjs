import { useEffect, useState, type ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, useViewport, type Metadata } from "textjs";
import Link from "textjs/link";
import { usePathname } from "textjs/navigation";

export const metadata: Metadata = {
  title: { default: "Edge Console", template: "%s · Edge Console" },
  description: "Deployments, logs and metrics — rendered in console.log.",
};

const NAV = [
  { key: "1", href: "/", label: "Overview" },
  { key: "2", href: "/deployments", label: "Deployments" },
  { key: "3", href: "/logs", label: "Logs" },
  { key: "4", href: "/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function useApiHealth(): "checking" | "healthy" | "offline" {
  const [state, setState] = useState<"checking" | "healthy" | "offline">("checking");
  useEffect(() => {
    if (typeof fetch !== "function" || typeof window === "undefined") {
      setState("offline");
      return;
    }
    let alive = true;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(() => alive && setState("healthy"))
      .catch(() => alive && setState("offline"));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  const pathname = usePathname();
  const viewport = useViewport();
  const health = useApiHealth();

  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 bg-surface shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ Edge Console
        </Text>
        <Text color={theme.border} wrap="nowrap">
          {"  /  "}
        </Text>
        <Text color={theme.muted} wrap="nowrap">
          acme-corp
        </Text>
        <Text color={theme.border} wrap="nowrap">
          {"  /  "}
        </Text>
        <Text color={theme.fg} wrap="nowrap">
          storefront
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          {`${viewport.cols}×${viewport.rows}  `}
        </Text>
        <Text bg={theme.elevated} color={theme.muted} wrap="nowrap">
          {" Pro "}
        </Text>
      </Box>

      <Box className="flex-row h-1 px-1 gap-3 shrink-0">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Box key={item.href} className="flex-row">
              <Text color={active ? theme.accent : theme.subtle} wrap="nowrap">{`${item.key} `}</Text>
              <Link href={item.href} shortcut={item.key} className={active ? "text-fg bold" : "text-muted no-underline"}>
                {item.label}
              </Link>
            </Box>
          );
        })}
      </Box>
      <Box className="h-1 shrink-0 px-1">
        <Text color={theme.border} wrap="nowrap">
          {"─".repeat(Math.max(0, viewport.cols - 2))}
        </Text>
      </Box>

      <Box className="grow flex-col px-2 overflow-hidden">{children}</Box>

      <Box className="flex-row h-1 shrink-0 bg-surface pl-6 pr-1 gap-2">
        <Text color={health === "healthy" ? theme.success : health === "offline" ? theme.warning : theme.subtle} wrap="nowrap">
          {health === "healthy" ? "● API healthy" : health === "offline" ? "● API offline (static)" : "○ API checking…"}
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          iad1 · {pathname}
        </Text>
        <Box className="grow" />
        <KeyHint keys="1-4" label="navigate" />
        <KeyHint keys="tab" label="focus" />
        <KeyHint keys="F2" label="devtools" />
      </Box>
    </Box>
  );
}
