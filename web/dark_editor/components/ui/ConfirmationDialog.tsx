'use client';

import { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-500/20' : 'bg-primary/20'}`}>
            <AlertTriangle className={`w-5 h-5 ${variant === 'destructive' ? 'text-red-500' : 'text-primary'}`} />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onCancel}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook per usare la modale di conferma
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
  } | null>(null);

  const confirm = (
    message: string,
    options?: {
      title?: string;
      variant?: 'default' | 'destructive';
      onConfirm?: () => void;
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title: options?.title || 'Confirm Action',
        message,
        variant: options?.variant || 'default',
        onConfirm: () => {
          options?.onConfirm?.();
          resolve(true);
        },
      });
    });
  };

  const handleCancel = () => {
    setDialogState(null);
  };

  const handleConfirm = () => {
    dialogState?.onConfirm();
    setDialogState(null);
  };

  const Dialog = dialogState ? (
    <ConfirmationDialog
      open={dialogState.open}
      title={dialogState.title}
      message={dialogState.message}
      variant={dialogState.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, Dialog };
}
