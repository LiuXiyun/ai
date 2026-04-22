export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          GEO Growth Tool · Demo build
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 sm:block">
          Local MVP
        </div>
        <div className="h-9 w-9 rounded-full bg-zinc-200" />
      </div>
    </header>
  );
}

