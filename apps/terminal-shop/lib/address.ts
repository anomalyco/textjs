import { notEmpty, type FieldDef } from "./form";
import type { AddressInput } from "./types";

/** `createAddressForm`: two groups, shown as two columns. */
export const ADDRESS_FORM: FieldDef[][] = [
  [
    { key: "name", title: "name", validate: notEmpty("name") },
    { key: "street1", title: "street 1", validate: notEmpty("street 1") },
    { key: "street2", title: "street 2" },
    { key: "city", title: "city", validate: notEmpty("city") },
  ],
  [
    { key: "province", title: "state" },
    { key: "country", title: "country", validate: notEmpty("country") },
    { key: "phone", title: "phone" },
    { key: "zip", title: "postal code", validate: notEmpty("postal code") },
  ],
];

export function newAddressValues(name: string | null | undefined): Record<string, string> {
  return { name: name ?? "", country: "US" };
}

export function addressValues(a: AddressInput): Record<string, string> {
  return { name: a.name, street1: a.street1, street2: a.street2 ?? "", city: a.city, province: a.province ?? "", country: a.country, zip: a.zip, phone: a.phone ?? "" };
}

export function addressFromValues(v: Record<string, string>): AddressInput {
  const t = (k: string): string => (v[k] ?? "").trim();
  const out: AddressInput = { name: t("name"), street1: t("street1"), city: t("city"), country: t("country").toUpperCase(), zip: t("zip") };
  if (t("street2")) out.street2 = t("street2");
  if (t("province")) out.province = t("province");
  if (t("phone")) out.phone = t("phone");
  return out;
}

/** `validateAddressInput`. */
export function validateAddress(a: AddressInput): string | null {
  if (a.country !== "US" && !a.phone) return "phone is required for international orders";
  return null;
}
