import { FileDown, Minus, Package, Plus, Send, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { SearchBar } from "../components/SearchBar";
import { useAsync } from "../hooks/useAsync";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { api } from "../services/api";
import type { LastQuantity, Product, Settings } from "../types/domain";
import { formatDate, orderName } from "../utils/format";

type QuantityMap = Record<number, { quantity: number; notes: string }>;

export function OrderBuilder({ settings, editOrderId, clearEditOrder }: { settings: Settings | null; editOrderId?: number | null; clearEditOrder?: () => void }) {
  const { data: products, error: productsError } = useAsync(() => api.products.list(), []);
  const { data: previous, error: previousError } = useAsync(api.orders.previous, []);
  const { data: lastQuantities, error: lastQuantitiesError } = useAsync(api.orders.lastQuantities, []);
  const [name, setName] = useState(orderName());
  const [orderId, setOrderId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [habitualOnly, setHabitualOnly] = useState(false);
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const lastByProduct = useMemo(() => new Map((lastQuantities ?? []).map((item) => [item.product_id, item])), [lastQuantities]);

  useEffect(() => {
    if (!editOrderId) return;
    api.orders.get(editOrderId).then((order) => {
      setName(order.name);
      setOrderId(order.id);
      setQuantities(
        order.items.reduce<QuantityMap>((acc, item) => {
          acc[item.product_id] = { quantity: item.quantity, notes: item.notes ?? "" };
          return acc;
        }, {})
      );
      clearEditOrder?.();
    });
  }, [editOrderId, clearEditOrder]);

  const visibleProducts = useMemo(() => {
    return (products ?? []).filter((product) => {
      const textMatch = product.name.toLowerCase().includes(query.toLowerCase());
      const categoryMatch = !category || product.category === category;
      const habitMatch = !habitualOnly || product.habitual === 1;
      return textMatch && categoryMatch && habitMatch;
    });
  }, [products, query, category, habitualOnly]);

  useDebouncedEffect(() => {
    const items = Object.entries(quantities).map(([productId, item]) => ({ productId: Number(productId), ...item }));
    if (!items.some((item) => item.quantity > 0)) return;
    const save = async () => {
      const saved = orderId
        ? await api.orders.update(orderId, { name, items })
        : await api.orders.create({ name, items });
      setOrderId(saved.id);
    };
    save().catch(console.error);
  }, [name, quantities, orderId], 550);

  function change(productId: number, delta: number) {
    setQuantities((current) => {
      const item = current[productId] ?? { quantity: 0, notes: "" };
      return { ...current, [productId]: { ...item, quantity: Math.max(0, Number((item.quantity + delta).toFixed(2))) } };
    });
  }

  function setQuantity(productId: number, quantity: number) {
    setQuantities((current) => ({ ...current, [productId]: { ...(current[productId] ?? { notes: "" }), quantity } }));
  }

  function setNote(productId: number, notes: string) {
    setQuantities((current) => ({ ...current, [productId]: { ...(current[productId] ?? { quantity: 0 }), notes } }));
  }

  async function share(format: "pdf" | "xlsx" | "csv") {
    const items = Object.entries(quantities).map(([productId, item]) => ({ productId: Number(productId), ...item }));
    const saved = orderId ? await api.orders.update(orderId, { name, items }) : await api.orders.create({ name, items });
    setOrderId(saved.id);
    window.open(api.exportUrl(saved.id, format), "_blank");
  }

  async function whatsapp() {
    const lines = (products ?? [])
      .filter((product) => (quantities[product.id]?.quantity ?? 0) > 0)
      .map((product) => `${product.name}: ${quantities[product.id].quantity} ${product.unit}`);
    window.open(`https://wa.me/?text=${encodeURIComponent(`${name}\n${lines.join("\n")}`)}`, "_blank");
  }

  return (
    <section className="space-y-4">
      {(productsError || previousError || lastQuantitiesError) && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-900">
          Errore API: {productsError ?? previousError ?? lastQuantitiesError}
        </div>
      )}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-leaf">Nuova lista</p>
          <input className="w-full bg-transparent text-2xl font-black outline-none" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <Button icon={<Send size={18} />} onClick={() => share(settings?.preferredExport ?? "pdf")}>Condividi</Button>
      </header>

      {!!previous?.length && (
        <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900">
          <p className="font-black text-amber-900 dark:text-amber-100">La settimana scorsa hai ordinato:</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {previous.slice(0, 12).map((item) => (
              <button key={item.product_id} onClick={() => setQuantity(item.product_id, item.quantity)} className="tap-target shrink-0 rounded-lg bg-white px-3 text-sm font-bold text-amber-950 ring-1 ring-amber-200 dark:bg-slate-900 dark:text-amber-100">
                {item.name} · usa {item.quantity}
              </button>
            ))}
          </div>
        </div>
      )}

      <SearchBar value={query} onChange={setQuery} placeholder="Cerca durante l'ordine" />
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <FilterButton active={!category} onClick={() => setCategory("")}>Tutte</FilterButton>
        {(settings?.categories ?? []).map((item) => <FilterButton key={item} active={category === item} onClick={() => setCategory(item)}>{item}</FilterButton>)}
        <FilterButton active={habitualOnly} onClick={() => setHabitualOnly(!habitualOnly)}><Star size={15} /> Abituali</FilterButton>
      </div>

      <div className="space-y-2">
        {visibleProducts.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            value={quantities[product.id]?.quantity ?? 0}
            onMinus={() => change(product.id, -1)}
            onPlus={() => change(product.id, 1)}
            onOpen={() => setOpenProduct(product)}
          />
        ))}
      </div>

      <div className="sticky bottom-20 z-20 grid grid-cols-4 gap-2 rounded-lg bg-white p-2 shadow-soft ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 lg:bottom-4">
        <Button variant="muted" icon={<FileDown size={18} />} onClick={() => share("pdf")}>PDF</Button>
        <Button variant="muted" onClick={() => share("xlsx")}>Excel</Button>
        <Button variant="muted" onClick={() => share("csv")}>CSV</Button>
        <Button onClick={whatsapp}>WhatsApp</Button>
      </div>

      {openProduct && (
        <ProductSheet
          product={openProduct}
          last={lastByProduct.get(openProduct.id)}
          note={quantities[openProduct.id]?.notes ?? ""}
          onNote={(note) => setNote(openProduct.id, note)}
          onUseLast={() => {
            const last = lastByProduct.get(openProduct.id);
            if (last?.last_quantity) setQuantity(openProduct.id, last.last_quantity);
          }}
          onClose={() => setOpenProduct(null)}
        />
      )}
    </section>
  );
}

function ProductRow({ product, value, onMinus, onPlus, onOpen }: { product: Product; value: number; onMinus: () => void; onPlus: () => void; onOpen: () => void }) {
  return (
    <article onClick={onOpen} className="grid grid-cols-[44px_1fr_44px_58px_44px] items-center gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-leaf dark:bg-teal-950"><Package size={22} /></div>
      <div className="min-w-0">
        <h3 className="truncate text-base font-black">{product.name}</h3>
        <p className="truncate text-xs font-semibold text-slate-500">{product.category} · {product.unit}</p>
      </div>
      <Button variant="muted" icon={<Minus size={18} />} onClick={(e) => { e.stopPropagation(); onMinus(); }} aria-label="Diminuisci" />
      <span className="text-center text-xl font-black tabular-nums">{value}</span>
      <Button icon={<Plus size={18} />} onClick={(e) => { e.stopPropagation(); onPlus(); }} aria-label="Aumenta" />
    </article>
  );
}

function ProductSheet({ product, last, note, onNote, onUseLast, onClose }: { product: Product; last?: LastQuantity; note: string; onNote: (value: string) => void; onUseLast: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-950/45 p-3" onClick={onClose}>
      <div className="w-full rounded-lg bg-white p-4 shadow-soft dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-black">{product.name}</h2>
        <p className="text-sm text-slate-500">{product.category} · ultima quantità: {last?.last_quantity ?? "-"} · {formatDate(last?.last_order_date)}</p>
        <textarea className="mt-3 min-h-28 w-full rounded-lg bg-slate-100 p-3 dark:bg-slate-800" placeholder="Note per questo ordine" value={note} onChange={(event) => onNote(event.target.value)} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="muted" onClick={onClose}>Chiudi</Button>
          <Button onClick={onUseLast}>Usa ultima quantità</Button>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`tap-target inline-flex shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-bold ${active ? "bg-leaf text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"}`}>
      {children}
    </button>
  );
}
