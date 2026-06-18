import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setToastHandler, ToastType } from '@/lib/api/toast';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    detail?: string;
    duration?: number;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, detail?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', detail?: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type, detail, duration }]);
        
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    // Register global handler for legacy bridge / non-react code
    useEffect(() => {
        setToastHandler(({ message, type, detail, duration }) => {
            toast(message, type, detail, duration);
        });
        return () => setToastHandler(() => {});
    }, [toast]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={`
                                pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border backdrop-blur-xl
                                ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                  t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                  t.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-blue-500/10 border-blue-500/20 text-blue-400'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {t.type === 'success' && <span className="material-icons text-xl">check_circle</span>}
                                    {t.type === 'error' && <span className="material-icons text-xl">error</span>}
                                    {t.type === 'warning' && <span className="material-icons text-xl">warning</span>}
                                    {t.type === 'info' && <span className="material-icons text-xl">info</span>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold leading-tight">{t.message}</p>
                                    {t.detail && <p className="text-xs mt-1 opacity-80 leading-relaxed">{t.detail}</p>}
                                </div>
                                <button 
                                    onClick={() => removeToast(t.id)}
                                    className="opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    <span className="material-icons text-base">close</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
