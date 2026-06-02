import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { hideToast } from '../store/logisticsSlice';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const toast = useSelector((state: RootState) => state.logistics.toast);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 animate-slide-in max-w-sm w-full bg-slate-900 border-slate-800 text-white">
      <div className="flex-shrink-0">
        {icons[toast.type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {toast.message}
      </div>
      <button
        onClick={() => dispatch(hideToast())}
        className="text-white/75 hover:text-white p-0.5 rounded-lg transition-colors hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
