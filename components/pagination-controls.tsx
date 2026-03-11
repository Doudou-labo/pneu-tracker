'use client';

export function PaginationControls({
  pageStart,
  pageEnd,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  pageStart: number;
  pageEnd: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <button onClick={onPrev} disabled={!hasPrev} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
        ← Précédent
      </button>
      <p className="text-sm text-gray-500">
        Affichage <span className="font-semibold text-gray-700">{pageStart}-{pageEnd}</span> sur <span className="font-semibold text-gray-700">{total}</span>
      </p>
      <button onClick={onNext} disabled={!hasNext} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
        Suivant →
      </button>
    </div>
  );
}
