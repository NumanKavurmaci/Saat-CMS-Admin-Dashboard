export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-blue-400/30 bg-blue-500/15">
        <div className="h-4 w-4 rounded-sm border-2 border-blue-300 shadow-[0_0_18px_rgba(78,140,255,.7)]" />
        <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-blue-500/25" />
      </div>
      {!compact && (
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-300">
            Saat Teknoloji
          </p>
          <p className="text-base font-semibold tracking-tight text-white">SaatCMS Control</p>
        </div>
      )}
    </div>
  );
}
