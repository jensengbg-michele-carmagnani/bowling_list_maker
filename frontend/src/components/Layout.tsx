import { BarChart3, Boxes, ClipboardList, Home, Moon, PlusCircle, Settings, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export type Page = "dashboard" | "products" | "order" | "history" | "settings";

const nav = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "order", label: "Nuovo", icon: PlusCircle },
  { id: "history", label: "Storico", icon: ClipboardList },
  { id: "products", label: "Prodotti", icon: Boxes },
  { id: "settings", label: "Impost.", icon: Settings }
] as const;

export function Layout({
  page,
  setPage,
  dark,
  setDark,
  children
}: {
  page: Page;
  setPage: (page: Page) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mist text-ink dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-leaf text-white">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ordini</p>
            <h1 className="text-lg font-bold">Magazzino</h1>
          </div>
        </div>
        <nav className="space-y-2">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`tap-target flex w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold ${
                page === item.id ? "bg-leaf text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
        <Button className="mt-8 w-full" variant="muted" icon={dark ? <Sun size={18} /> : <Moon size={18} />} onClick={() => setDark(!dark)}>
          {dark ? "Chiaro" : "Scuro"}
        </Button>
      </aside>

      <main className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-4 lg:ml-64 lg:px-8 lg:pb-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`tap-target flex flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${
              page === item.id ? "text-leaf" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <item.icon size={22} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
