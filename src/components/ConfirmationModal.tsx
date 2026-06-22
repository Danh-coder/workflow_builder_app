import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Called by X button and backdrop click. Defaults to onCancel if omitted. */
  onClose?: () => void;
}

export default function ConfirmationModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmationModalProps) {
  const handleClose = onClose ?? onCancel;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />
      {/* Modal */}
      <div className="relative bg-surface-2 border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slide-up">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-4 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
          danger ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
        }`}>
          <AlertTriangle size={22} className={danger ? 'text-red-400' : 'text-yellow-400'} />
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{message}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
