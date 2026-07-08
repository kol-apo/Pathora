export default function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-warm-gray p-5">
      <p className="font-fraunces text-[32px] font-bold leading-none text-amber-dark">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.8px] text-text-muted">
        {label}
      </p>
    </div>
  );
}
