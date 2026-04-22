export function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
      {subtext ? (
        <div className="mt-2 text-xs text-zinc-500">{subtext}</div>
      ) : null}
    </div>
  );
}

