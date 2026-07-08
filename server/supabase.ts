import { createClient } from "@supabase/supabase-js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type SettingsRecord = {
  businessName: string;
  preferredExport: "pdf" | "xlsx" | "csv";
  categories: string[];
  units: string[];
  logo: string;
};

export const defaultSettings: SettingsRecord = {
  businessName: "Magazzino",
  preferredExport: "pdf",
  categories: ["Bevande", "Alimentari", "Pulizia", "Monouso", "Altro"],
  units: ["pezzi", "kg", "litri", "confezioni"],
  logo: ""
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Variabile d'ambiente SUPABASE_URL mancante");
}

if (!supabaseKey) {
  throw new Error("Variabile d'ambiente Supabase server-side mancante");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

let ensureDefaultsPromise: Promise<void> | null = null;

export async function ensureDefaultSettings() {
  if (!ensureDefaultsPromise) {
    ensureDefaultsPromise = seedDefaultSettings();
  }
  return ensureDefaultsPromise;
}

async function seedDefaultSettings() {
  const { data, error } = await supabase.from("settings").select("key");
  assertNoError(error, "Lettura impostazioni iniziali");

  const existing = new Set((data ?? []).map((row: { key: string }) => row.key));
  const missing = Object.entries(defaultSettings)
    .filter(([key]) => !existing.has(key))
    .map(([key, value]) => ({ key, value }));

  if (!missing.length) return;

  const { error: insertError } = await supabase.from("settings").upsert(missing, { onConflict: "key" });
  assertNoError(insertError, "Inserimento impostazioni iniziali");
}

export function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export function parseSettingValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => parseSettingValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, parseSettingValue(item)])
    );
  }

  return String(value);
}

export function toHabitualFlag(value: boolean | null | undefined) {
  return value ? 1 : 0;
}
