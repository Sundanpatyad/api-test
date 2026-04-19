import { useUIStore } from '@/store/uiStore';

export default function ConfirmDialog() {
  const { showConfirmDialog, confirmDialogConfig, setShowConfirmDialog } = useUIStore();

  if (!showConfirmDialog || !confirmDialogConfig) return null;

  const { title, message, itemName, onConfirm, onCancel, confirmText = 'Delete', danger = true } = confirmDialogConfig;

  const handleConfirm = () => {
    onConfirm();
    setShowConfirmDialog(false, null);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    setShowConfirmDialog(false, null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div className="bg-surface-1 border border-surface-700 rounded-2xl shadow-glass w-full max-w-sm animate-slide-up">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {danger && (
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            <h2 className="text-sm font-semibold text-tx-primary">{title}</h2>
          </div>
          
          <p className="text-sm text-surface-400 mb-2">
            {message}
          </p>
          {itemName && (
            <p className="text-sm font-medium text-tx-primary mb-4 bg-surface-800 px-3 py-2 rounded-lg">
              {itemName}
            </p>
          )}
          
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${
                danger 
                  ? 'bg-danger text-white hover:bg-danger/90' 
                  : 'btn-primary'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
