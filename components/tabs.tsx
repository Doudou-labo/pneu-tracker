type Tab = 'form' | 'history' | 'inversions' | 'dashboard';

export function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items: Array<[Tab, string]> = [
    ['form', '📝 Saisie'],
    ['history', '📋 Historique'],
    ['inversions', '↔️ Inversions'],
    ['dashboard', '📊 Dashboard'],
  ];

  return (
    <div className="mb-6 flex w-fit gap-1 rounded-lg bg-[#E8EEF6] p-1" role="tablist" aria-label="Navigation principale">
      {items.map(([value, label]) => (
        <button
          key={value}
          role="tab"
          aria-selected={tab === value}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === value ? 'bg-[#144390] text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
