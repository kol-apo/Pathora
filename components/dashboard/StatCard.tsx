export default function StatCard({ value, label }: { value: string | number; label: string }) {
  const isNumeric = typeof value === 'number';
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-5">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span
        className={
          isNumeric
            ? 'text-[28px] font-semibold tracking-[-0.02em] text-ink'
            : 'mt-1.5 text-[19px] font-semibold tracking-[-0.01em] text-ink'
        }
      >
        {value}
      </span>
    </div>
  );
}
