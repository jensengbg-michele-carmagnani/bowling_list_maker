import { z } from "zod";
import { assertNoError, defaultSettings, ensureDefaultSettings, parseSettingValue, supabase } from "../supabase.js";

const settingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  logo: z.string().optional(),
  preferredExport: z.enum(["pdf", "xlsx", "csv"]).optional(),
  categories: z.array(z.string().min(1)).optional(),
  units: z.array(z.string().min(1)).optional()
});

export async function getSettings() {
  await ensureDefaultSettings();

  const { data, error } = await supabase.from("settings").select("key, value");
  assertNoError(error, "Lettura impostazioni");

  const result = (data ?? []).reduce<Record<string, unknown>>((acc: Record<string, unknown>, row: { key: string; value: unknown }) => {
    acc[row.key] = parseSettingValue(row.value);
    return acc;
  }, { ...defaultSettings });

  return result;
}

export async function updateSettings(input: unknown) {
  const settings = settingsSchema.parse(input);

  const entries = Object.entries(settings).map(([key, value]) => ({
    key,
    value: parseSettingValue(value)
  }));

  if (entries.length) {
    const { error } = await supabase.from("settings").upsert(entries, { onConflict: "key" });
    assertNoError(error, "Aggiornamento impostazioni");
  }

  return getSettings();
}
