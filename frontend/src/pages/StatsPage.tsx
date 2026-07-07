import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";

export function StatsPage() {
  const { data } = useAsync(api.stats.orders, []);
  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-leaf">Analisi</p>
        <h1 className="text-2xl font-black">Statistiche</h1>
      </header>
      <div className="h-72 rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.ordersOverTime ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantity" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {(data?.frequentProducts ?? []).map((item) => (
          <article key={String(item.name)} className="rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="font-black">{String(item.name)}</h3>
            <p className="text-sm text-slate-500">Ordinato {String(item.times_ordered)} volte · totale {String(item.total_quantity)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
