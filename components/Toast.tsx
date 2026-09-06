'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const toastEvent = new EventTarget();

export function toast(message: string, type: 'success' | 'error' = 'success') {
  const event = new CustomEvent('toast', { detail: { message, type } });
  toastEvent.dispatchEvent(event);
}

export function Toaster() {
  const [toasts, setToasts] = useState<{id: number, message: string, type: string}[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message: e.detail.message, type: e.detail.type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    toastEvent.addEventListener('toast', handleToast);
    return () => toastEvent.removeEventListener('toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg text-sm transition-all animate-in slide-in-from-bottom-5">
          {t.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
