import { useEffect, useState, type ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "@textjs/next";
import Link from "@textjs/next/link";
import { usePathname } from "@textjs/next/navigation";

export const metadata: Metadata = {
  title: { default: "Edge Console", template: "%s · Edge Console" },
  description: "Deployments, logs and metrics — rendered in console.log.",
};

const NAV = [
  { key: "1", href: "/", label: "Overview" },
  { key: "2", href: "/deployments", label: "Deployments" },
  { key: "3", href: "/logs", label: "Logs" },
  { key: "4", href: "/settings", label: "Settings" },
  { key: "5", href: "/status", label: "Status" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function useApiHealth(): "checking" | "healthy" | "offline" {
  const [state, setState] = useState<"checking" | "healthy" | "offline">("checking");
  useEffect(() => {
    // Server-rendered routes (and prerendered shells) have no browser to probe from.
    if (typeof window === "undefined") return;
    if (typeof fetch !== "function") {
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
  const health = useApiHealth();

  return (
    <Box className="flex-col w-full h-full py-1">
      <Box className="flex-row h-1 px-2 gap-3 shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ Edge Console
        </Text>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} shortcut={item.key} className={active ? "text-fg no-underline" : "text-subtle no-underline"}>
              {item.label}
            </Link>
          );
        })}
      </Box>

      <Box className="grow flex-col px-2 pt-1 overflow-hidden">{children}</Box>

      <Box className="flex-row h-1 shrink-0 px-2 gap-3">
        <KeyHint keys="1-5" label="pages" />
        <KeyHint keys="tab" label="focus" />
        <Box className="grow" />
        <Text color={health === "healthy" ? theme.subtle : theme.warning} wrap="nowrap">
          {health === "offline" ? "api offline" : ""}
        </Text>
      </Box>
    </Box>
  );
}
