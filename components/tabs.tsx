type Tab = 'form' | 'history' | 'dashboard';

export function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items: Array<[Tab, string]> = [
    ['form', '📝 Saisie'],
    ['history', '📋 Historique'],
    ['dashboard', '📊 Dashboard'],
  ];

  return (
    <div className="mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Navigation principale">
      {items.map(([value, label]) => (
        <button
          key={value}
          role="tab"
          aria-selected={tab === value}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === value ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
