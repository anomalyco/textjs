Text.js includes form controls, dialogs and toasts. Every control joins the `Tab` order and responds to `Space` or `Enter`.

```tsx#controls
<Checkbox label="Web Analytics" description="privacy-friendly" defaultChecked />
<Switch label="Edge runtime" defaultChecked />
<RadioGroup orientation="horizontal" value={plan} onChange={setPlan} options={plans} />
<Slider label="Concurrency" defaultValue={40} width={20} />
<Button variant="primary" onPress={deploy}>Deploy</Button>
```

## Controls

| Component | Keys | Value |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (or `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

All of them accept `autoFocus`, `focused`, `id` and `disabled`. Controlled and uncontrolled (`defaultChecked`, `defaultValue`) both work.

### Buttons

`variant` is `primary`, `secondary`, `ghost` or `danger`. Focus fills the button with the accent color without changing its size.

## `<Dialog>`

A `<Modal>` with a description and an actions row.

```tsx
<Dialog
  open={open}
  title="Invite teammate"
  description="They'll get an email with a link."
  onClose={close}
  actions={<Button variant="primary" onPress={send}>Send</Button>}
>
  <Input autoFocus placeholder="email" />
</Dialog>
```

## `<Confirm>`

Yes or no. `y` and `n` answer directly; `←` `→` move between buttons. `destructive` styles the confirm button and focuses Cancel first.

```tsx
<Confirm
  open={confirming}
  destructive
  title="Delete project?"
  message="This removes acme-web and all 312 deployments."
  confirmLabel="Delete"
  onConfirm={remove}
  onCancel={() => setConfirming(false)}
/>
```

## Toasts

Render one `<Toaster />`, then call `useToast()` anywhere in the same root.

```tsx
const toast = useToast();

toast("Copied");
toast.success("Deployed", { description: "dpl_8f2k is live on iad1." });
toast.error("Build failed");
await toast.promise(deploy(), {
  loading: "Deploying…",
  success: (d) => `Deployed ${d.id}`,
  error: "Deploy failed",
});
```

| Option | Description |
| :-- | :-- |
| `duration` | Milliseconds (default `4000`; loading toasts stay) |
| `id` | Reuse to update a toast in place |
| `position` | On `<Toaster>`: `bottom-right` (default), `top-center`, … |
| `max` | On `<Toaster>`: visible at once (default `3`) |

Toasts render above modals and never take focus.
