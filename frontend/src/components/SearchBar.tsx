import { Search } from "lucide-react";

export function SearchBar({ value, onChange, placeholder = "Cerca..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="sticky top-0 z-10 flex items-center gap-2 bg-mist/95 px-1 py-2 backdrop-blur dark:bg-slate-950/95">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <Search size={21} />
      </span>
      <input
        className="h-12 w-full rounded-lg border-0 bg-white px-4 text-base font-medium text-ink shadow-sm ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-leaf dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
