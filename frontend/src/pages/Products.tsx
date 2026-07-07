import { Edit3, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { SearchBar } from "../components/SearchBar";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { Product, Settings } from "../types/domain";

type Draft = Partial<Product> & { name: string; category: string; unit: string };

export function Products({ settings }: { settings: Settings | null }) {
  const { data: products, refresh } = useAsync(() => api.products.list(), []);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [draft, setDraft] = useState<Draft>({ name: "", category: settings?.categories[0] ?? "Altro", unit: settings?.units[0] ?? "pezzi" });

  const filtered = useMemo(
    () => (products ?? []).filter((product) => product.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [products, query]
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (editing) await api.products.update(editing.id, draft);
    else await api.products.create(draft);
    setEditing(null);
    setDraft({ name: "", category: settings?.categories[0] ?? "Altro", unit: settings?.units[0] ?? "pezzi", notes: "" });
    refresh();
  }

  function startEdit(product: Product) {
    setEditing(product);
    setDraft(product);
  }

  async function remove(product: Product) {
    if (window.confirm(`Eliminare ${product.name}?`)) {
      await api.products.remove(product.id);
      refresh();
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-leaf">Catalogo</p>
        <h1 className="text-2xl font-black">Prodotti</h1>
      </header>
      <SearchBar value={query} onChange={setQuery} placeholder="Cerca prodotto" />

      <form onSubmit={save} className="grid gap-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:grid-cols-5">
        <input className="h-12 rounded-lg bg-slate-100 px-3 dark:bg-slate-800 sm:col-span-2" placeholder="Nome" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <select className="h-12 rounded-lg bg-slate-100 px-3 dark:bg-slate-800" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {(settings?.categories ?? ["Altro"]).map((category) => <option key={category}>{category}</option>)}
        </select>
        <select className="h-12 rounded-lg bg-slate-100 px-3 dark:bg-slate-800" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
          {(settings?.units ?? ["pezzi"]).map((unit) => <option key={unit}>{unit}</option>)}
        </select>
        <Button icon={<Plus size={18} />}>{editing ? "Aggiorna" : "Aggiungi"}</Button>
        <textarea className="min-h-20 rounded-lg bg-slate-100 p-3 dark:bg-slate-800 sm:col-span-5" placeholder="Note opzionali" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </form>

      <div className="space-y-2">
        {filtered.map((product) => (
          <article
            key={product.id}
            onDoubleClick={() => startEdit(product)}
            onTouchStart={(event) => {
              const x = event.touches[0].clientX;
              const timer = window.setTimeout(() => setSelected((ids) => ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id]), 550);
              const end = (endEvent: TouchEvent) => {
                window.clearTimeout(timer);
                const delta = endEvent.changedTouches[0].clientX - x;
                if (delta > 70) startEdit(product);
                if (delta < -70) remove(product);
                window.removeEventListener("touchend", end);
              };
              window.addEventListener("touchend", end);
            }}
            className={`flex items-center gap-3 rounded-lg bg-white p-3 ring-1 ${selected.includes(product.id) ? "ring-leaf" : "ring-slate-200"} dark:bg-slate-900 dark:ring-slate-800`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-leaf dark:bg-teal-950">
              <BoxesIcon />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-black">{product.name}</h3>
              <p className="text-sm text-slate-500">{product.category} · {product.unit}</p>
            </div>
            <Button variant="muted" icon={<Edit3 size={18} />} onClick={() => startEdit(product)} aria-label="Modifica" />
            <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => remove(product)} aria-label="Elimina" />
          </article>
        ))}
      </div>
    </section>
  );
}

function BoxesIcon() {
  return <span className="text-xl">▣</span>;
}
