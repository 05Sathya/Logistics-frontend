import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, MapPin, Navigation, ShieldCheck, LogOut } from 'lucide-react';
import { api } from '../services/api';
import type { AppDispatch, RootState } from '../store/store';
import { fetchRiderOrders, showToast } from '../store/logisticsSlice';
import { logout } from '../store/authSlice';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { socketService } from '../services/socket';

export const RiderDeliveries = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { riderOrders } = useSelector((state: RootState) => state.logistics);
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    if (isOnline) {
      dispatch(fetchRiderOrders());
    }

    // Auto refresh when a new order is assigned to this rider
    socketService.on('order_assigned', () => {
      if (isOnline) dispatch(fetchRiderOrders());
    });
    
    socketService.on('order_status_change', () => {
      if (isOnline) dispatch(fetchRiderOrders());
    });

    return () => {
      socketService.off('order_assigned');
      socketService.off('order_status_change');
    };
  }, [dispatch, isOnline]);

  const toggleStatus = async () => {
    try {
      if (isOnline && riderOrders.length > 0) {
        dispatch(showToast({
          message: 'Active orders will be auto-reassigned when you go offline.',
          type: 'info',
        }));
      }

      const newStatus = isOnline ? 'offline' : 'available';
      await api.patch('/riders/my/status', { status: newStatus });
      setIsOnline(!isOnline);
      dispatch(showToast({ message: `You are now ${newStatus}`, type: 'success' }));
      
      if (newStatus === 'available') {
        dispatch(fetchRiderOrders());
      }
    } catch (err: any) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to update status', type: 'error' }));
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f2937_100%)] p-4 sm:p-6 lg:p-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="chip mb-3 border-slate-700 bg-slate-800 text-slate-200">Rider Portal</p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Welcome, {user?.name || 'Rider'}</h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">Track your active assignments, update delivery status, and stay responsive on the move.</p>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-2xl transition-colors border border-red-500/20 shadow-inner">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {isOnline ? (
          <div className="space-y-6">
            {riderOrders.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-300 shadow-2xl shadow-slate-950/30 sm:p-12">
                No active deliveries assigned to you right now. Keep this page open.
              </div>
            ) : (
              riderOrders.map(order => (
                <OrderCard key={order._id} order={order} dispatch={dispatch} />
              ))
            )}
          </div>
        ) : (
          <div className="relative rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-300 shadow-2xl shadow-slate-950/30 sm:p-12">
            <div className="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-3 sm:right-6 sm:top-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 shadow-inner">
                Active Orders: <span className="font-semibold text-indigo-300">0</span>
              </div>
              <button
                onClick={toggleStatus}
                className="rounded-2xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-2.5 text-sm font-semibold text-indigo-100 transition-all duration-200 hover:bg-indigo-500/25"
              >
                Go Online
              </button>
            </div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <ShieldCheck className="h-8 w-8 text-indigo-300" />
            </div>
            <h2 className="text-xl font-bold text-white">You are offline</h2>
            <p className="mt-2 max-w-sm text-slate-300">Go online to start receiving delivery requests and viewing your active assignments.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Logout"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsLogoutModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleLogout}>Confirm Logout</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Are you sure you want to securely log out of your session?</p>
        </div>
      </Modal>
    </div>
  );
};

const OrderCard = ({ order, dispatch }: any) => {
  const [status, setStatus] = useState(order.status);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  const quickReasons = [
    "Customer not available",
    "Incorrect address",
    "Customer rejected package",
    "Vehicle breakdown",
    "Unable to locate address"
  ];

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleUpdateStatus = async () => {
    setLoading(true);
    try {
      let payload: any = { status };
      
      if (status === 'delivered' && photo) {
        payload.proofPhoto = await toBase64(photo);
      } else if (status === 'failed') {
        if (!failureReason.trim()) {
          dispatch(showToast({ message: 'Please provide or select a failure reason', type: 'error' }));
          setLoading(false);
          return;
        }
        payload.failureReason = failureReason;
      }

      await api.patch(`/orders/${order._id}/status`, payload);
      dispatch(showToast({ message: `Status updated to ${status}`, type: 'success' }));
      dispatch(fetchRiderOrders());
    } catch (err: any) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to update status', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/30 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-bold text-slate-400">#{order._id.substring(0,8).toUpperCase()}</span>
          <h2 className="text-lg font-bold text-white">{order.packageDetails || 'Package'}</h2>
        </div>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">{order.status.toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <MapPin className="mt-0.5 h-5 w-5 text-indigo-300" />
            <div>
              <p className="text-sm font-medium text-slate-100">{order.pickupAddress}</p>
              <p className="text-xs text-slate-300">Pickup Location</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Navigation className="mt-0.5 h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-sm font-medium text-slate-100">{order.dropAddress}</p>
              <p className="text-xs text-slate-300">Drop Location</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800 pt-4">
        <label className="mb-2 block text-sm font-medium text-slate-200">Update Status</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            disabled={order.status === 'delivered' || order.status === 'failed'}
            className="input-shell bg-slate-950/80 text-slate-100 border-slate-700 focus:border-indigo-400 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          
          {status === 'delivered' && order.status !== 'delivered' && (
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-3 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-900">
              <Camera className="w-4 h-4" />
              <span>{photo ? photo.name : 'Upload Proof'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files?.[0] || null)} />
            </label>
          )}

          <button 
            onClick={handleUpdateStatus} 
            disabled={loading || order.status === status || order.status === 'delivered' || order.status === 'failed'}
            className="btn-primary py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500"
          >
            {loading ? 'Saving...' : (order.status === 'delivered' || order.status === 'failed') ? 'Completed' : 'Confirm'}
          </button>
        </div>

        {status === 'failed' && order.status !== 'failed' && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
            <label className="mb-3 block text-sm font-medium text-red-100">Select or type a reason for failure:</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickReasons.map(r => (
                <button
                  key={r}
                  onClick={() => setFailureReason(r)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    failureReason === r 
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-slate-950/70 text-red-100 border-red-500/20 hover:bg-red-500/15'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="Or type custom reason here..."
              className="w-full rounded-xl border border-red-500/20 bg-slate-950/80 p-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
            />
          </div>
        )}
      </div>
    </div>
  );
};
