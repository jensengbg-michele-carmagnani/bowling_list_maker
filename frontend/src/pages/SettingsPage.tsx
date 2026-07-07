import { Beer, ChefHat, Download, Moon, RotateCcw, Upload } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { Button } from "../components/Button";
import { api } from "../services/api";
import type { Settings } from "../types/domain";

export function SettingsPage({ settings, refresh, dark, setDark }: { settings: Settings | null; refresh: () => void; dark: boolean; setDark: (value: boolean) => void }) {
  const [draft, setDraft] = useState(settings);
  if (!draft) return null;
  const currentDraft = draft;

  async function save() {
    await api.settings.update(currentDraft);
    refresh();
  }

  async function uploadProducts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await api.importProducts(file);
    event.target.value = "";
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && window.confirm("Ripristinare il database sostituendo quello attuale?")) await api.restore(file);
    event.target.value = "";
  }

  async function seedBeverages() {
    const result = await api.seedBeverages();
    window.alert(`Catalogo bevande caricato: ${result.inserted} nuovi prodotti, ${result.skipped} gia presenti.`);
    refresh();
  }

  async function seedKitchen() {
    const result = await api.seedKitchen();
    window.alert(`Catalogo cucina caricato: ${result.inserted} nuovi prodotti, ${result.skipped} gia presenti.`);
    refresh();
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-leaf">Preferenze</p>
        <h1 className="text-2xl font-black">Impostazioni</h1>
      </header>
      <div className="grid gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <label className="grid gap-1 text-sm font-bold">Nome attività
          <input className="h-12 rounded-lg bg-slate-100 px-3 dark:bg-slate-800" value={currentDraft.businessName} onChange={(e) => setDraft({ ...currentDraft, businessName: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-bold">Formato preferito
          <select className="h-12 rounded-lg bg-slate-100 px-3 dark:bg-slate-800" value={currentDraft.preferredExport} onChange={(e) => setDraft({ ...currentDraft, preferredExport: e.target.value as Settings["preferredExport"] })}>
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">Categorie
          <textarea className="min-h-24 rounded-lg bg-slate-100 p-3 dark:bg-slate-800" value={currentDraft.categories.join("\n")} onChange={(e) => setDraft({ ...currentDraft, categories: splitLines(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-bold">Unità di misura
          <textarea className="min-h-20 rounded-lg bg-slate-100 p-3 dark:bg-slate-800" value={currentDraft.units.join("\n")} onChange={(e) => setDraft({ ...currentDraft, units: splitLines(e.target.value) })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Moon size={18} />} variant="muted" onClick={() => setDark(!dark)}>{dark ? "Tema chiaro" : "Tema scuro"}</Button>
          <Button onClick={save}>Salva</Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="ghost" icon={<Beer size={18} />} onClick={seedBeverages}>Carica catalogo bevande</Button>
        <Button variant="ghost" icon={<ChefHat size={18} />} onClick={seedKitchen}>Carica catalogo cucina</Button>
        <label className="tap-target flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <Upload size={18} /> Importa prodotti Excel
          <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={uploadProducts} />
        </label>
        <Button variant="ghost" icon={<Download size={18} />} onClick={() => window.open(api.databaseUrl(), "_blank")}>Backup database</Button>
        <label className="tap-target flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:col-span-2">
          <RotateCcw size={18} /> Ripristina database
          <input className="hidden" type="file" accept=".sqlite,.db" onChange={restore} />
        </label>
      </div>
    </section>
  );
}

function splitLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
