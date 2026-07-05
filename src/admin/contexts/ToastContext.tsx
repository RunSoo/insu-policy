import { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // 4초 뒤 자동 사라짐
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={clsx(
                "pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-md",
                toast.type === 'success' && "bg-white border-green-100 text-gray-800",
                toast.type === 'error' && "bg-white border-red-100 text-gray-800",
                toast.type === 'info' && "bg-white border-gray-100 text-gray-800"
              )}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />}
              {toast.type === 'error' && <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
              {toast.type === 'info' && <Info className="w-6 h-6 text-[#3182F6] shrink-0" />}
              
              <span className="flex-1 text-sm font-semibold">{toast.message}</span>
              
              <button 
                onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} 
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
