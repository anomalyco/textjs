import { useState, type ReactNode } from "react";
import { Box, Input, Select, Text, useFocusManager, useInput, useTheme, type SelectOption } from "@textjs/react";

const REGIONS: ReadonlyArray<SelectOption> = [
  { value: "iad1", label: "Washington, D.C." },
  { value: "fra1", label: "Frankfurt" },
  { value: "hnd1", label: "Tokyo" },
  { value: "devtools", label: "Your DevTools Console" },
];

export function FormDemo(): ReactNode {
  const theme = useTheme();
  const focus = useFocusManager();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("devtools");
  const [submitted, setSubmitted] = useState<string | null>(null);

  // Tab moves between fields even where Tab focus cycling is disabled (the console companion).
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

  const submit = (to = region): void => {
    const n = name.trim();
    setSubmitted(n ? `Deployed ${n} to ${REGIONS.find((r) => r.value === to)?.label ?? to}.` : "");
  };

  return (
    <Box className="flex-col grow px-2 gap-1" width="100%" maxWidth={60}>
      <Text color="muted">Project name</Text>
      <Box className="border rounded px-1 shrink-0" borderColor={theme.border} focusedBorderColor={theme.borderFocus}>
        <Input id="form-name" value={name} onChange={setName} onSubmit={() => submit()} placeholder="my-text-app" autoFocus />
      </Box>
      <Text color="muted" marginTop={1}>
        Region
      </Text>
      <Select id="form-region" options={REGIONS} value={region} onChange={(v) => {
          setRegion(v);
          submit(v);
        }}
        limit={4} showDescriptions={false} />
      <Box className="h-1 shrink-0" marginTop={1}>
        {submitted === null ? null : submitted === "" ? <Text color="danger">Name required.</Text> : <Text color="success">{`✓ ${submitted}`}</Text>}
      </Box>
    </Box>
  );
}
