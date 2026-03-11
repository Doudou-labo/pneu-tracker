'use client';

type Toast = { id: number; type: 'success' | 'error' | 'info'; text: string };

export function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
          }`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
