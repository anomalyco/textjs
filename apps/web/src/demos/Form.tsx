import { useState, type ReactNode } from "react";
import { Badge, Box, Input, KeyHint, Select, Tabs, Text, useFocusManager, useInput, useTheme, type SelectOption } from "@textjs/react";

const REGIONS: ReadonlyArray<SelectOption> = [
  { value: "iad1", label: "Washington, D.C.", hint: "iad1" },
  { value: "sfo1", label: "San Francisco", hint: "sfo1" },
  { value: "fra1", label: "Frankfurt", hint: "fra1" },
  { value: "hnd1", label: "Tokyo", hint: "hnd1" },
  { value: "devtools", label: "Your DevTools Console", hint: "edge", badge: "new" },
];

const PLANS = [
  { id: "hobby", label: "Hobby", shortcut: "h" },
  { id: "pro", label: "Pro", shortcut: "p" },
  { id: "enterprise", label: "Enterprise", shortcut: "e" },
] as const;

export interface FormDemoProps {
  title?: string;
}

export function FormDemo({ title = "new-project" }: FormDemoProps): ReactNode {
  const theme = useTheme();
  const focus = useFocusManager();
  const [name, setName] = useState(title);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("devtools");
  const [plan, setPlan] = useState<string>("pro");
  const [submitted, setSubmitted] = useState<string | null>(null);

  // Tab / ↓ / ↑ move between fields (also inside the console companion, where Tab otherwise switches app tabs).
  useInput(
    (e) => {
      if (e.key === "tab" && !e.ctrl && !e.meta) {
        e.stopPropagation();
        if (e.shift) focus.focusPrevious();
        else focus.focusNext();
      }
    },
    { priority: 5 },
  );

  const submit = (): void => {
    const valid = name.trim().length > 0 && /.+@.+/.test(email);
    setSubmitted(valid ? `Deployed ${name.trim()} to ${region} on ${plan} · 0 DOM nodes created` : "error: name and a valid email are required");
  };

  return (
    <Box className="flex-col grow px-2 py-1 gap-1">
      <Box className="flex-row shrink-0 gap-1">
        <Text bold color="fg">
          Create Project
        </Text>
        <Box className="grow" />
        <Tabs tabs={PLANS} activeTab={plan} onChange={setPlan} variant="pill" shortcuts={false} focusable id="form-plan" />
      </Box>
      <Box className="flex-row gap-2 shrink-0">
        <Box className="flex-col grow basis-0 gap-1">
          <Box className="flex-col shrink-0">
            <Text color="muted">Project name</Text>
            <Box className="border rounded px-1" borderColor={theme.border} focusedBorderColor={theme.borderFocus}>
              <Input id="form-name" value={name} onChange={setName} onSubmit={() => focus.focusNext()} placeholder="my-text-app" autoFocus />
            </Box>
          </Box>
          <Box className="flex-col shrink-0">
            <Text color="muted">Email</Text>
            <Box className="border rounded px-1" borderColor={theme.border}>
              <Input id="form-email" value={email} onChange={setEmail} onSubmit={submit} placeholder="you@company.com" />
            </Box>
          </Box>
        </Box>
        <Box className="flex-col grow basis-0">
          <Text color="muted">Region</Text>
          <Box className="border rounded px-1" borderColor={theme.border}>
            <Select id="form-region" options={REGIONS} value={region} onChange={(v) => setRegion(v)} limit={5} showDescriptions={false} />
          </Box>
        </Box>
      </Box>
      <Box className="flex-row gap-1 shrink-0">
        {submitted === null ? (
          <Text color="subtle">Press Enter in the email field to deploy.</Text>
        ) : submitted.startsWith("error") ? (
          <Text color="danger">{`✕ ${submitted}`}</Text>
        ) : (
          <>
            <Badge variant="success">READY</Badge>
            <Text color="success">{submitted}</Text>
          </>
        )}
      </Box>
      <Box className="flex-row gap-2 shrink-0">
        <KeyHint keys="tab" label="next field" />
        <KeyHint keys="↑/↓" label="region" />
        <KeyHint keys="enter" label="submit" />
        <KeyHint keys="esc" label="blur" />
      </Box>
    </Box>
  );
}
