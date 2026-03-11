export function HeaderStats({ total, thisMonth, vehicles }: { total: number; thisMonth: number; vehicles: number }) {
  return (
    <div className="flex gap-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center">
        <div className="text-xl font-bold text-blue-700">{thisMonth}</div>
        <div className="text-xs text-blue-500">ce mois</div>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center">
        <div className="text-xl font-bold text-green-700">{total}</div>
        <div className="text-xs text-green-500">total</div>
      </div>
      <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-center">
        <div className="text-xl font-bold text-purple-700">{vehicles}</div>
        <div className="text-xs text-purple-500">véhicules</div>
      </div>
    </div>
  );
}
