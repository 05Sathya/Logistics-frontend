import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Package, MapPin, Navigation, Send, AlertCircle, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import type { AppDispatch, RootState } from '../store/store';
import { fetchClientOrders, showToast } from '../store/logisticsSlice';
import { logout } from '../store/authSlice';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

export const ClientOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { clientOrders } = useSelector((state: RootState) => state.logistics);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Initial fetch and Socket setup
  useEffect(() => {
    dispatch(fetchClientOrders());

    socketService.on('order_assigned', () => {
      dispatch(fetchClientOrders());
    });
    
    socketService.on('order_status_change', () => {
      dispatch(fetchClientOrders());
    });

    return () => {
      socketService.off('order_assigned');
      socketService.off('order_status_change');
    };
  }, [dispatch]);

  // Retry timer
  useEffect(() => {
    let timer: any;
    if (retryCountdown > 0) {
      timer = setInterval(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (retryCountdown > 0) return;
    
    setLoading(true);
    try {
      await api.post('/orders', {
        pickupAddress: pickup,
        dropAddress: drop,
        packageDetails: details,
        priority
      });
      // Clear form
      setPickup(''); setDrop(''); setDetails(''); setPriority('normal');
      dispatch(showToast({ message: 'Order placed successfully!', type: 'success' }));
      dispatch(fetchClientOrders());
    } catch (err: any) {
      if (err.response?.status === 503) {
        setRetryCountdown(err.response.data.retryAfter || 60);
      } else {
        dispatch(showToast({ message: err.response?.data?.message || 'Failed to place order.', type: 'error' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-slate-800 text-slate-100 border border-slate-700';
      case 'assigned': return 'bg-indigo-500/15 text-indigo-100 border border-indigo-500/30';
      case 'picked_up': return 'bg-amber-500/15 text-amber-100 border border-amber-500/30';
      case 'delivered': return 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/30';
      case 'failed': return 'bg-red-500/15 text-red-100 border border-red-500/30';
      default: return 'bg-slate-800 text-slate-100 border border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#07111f_0%,#111827_35%,#312e81_70%,#111827_100%)] p-4 sm:p-6 lg:p-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8 flex justify-between items-start">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">Client Portal</p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Welcome, {user?.name || 'Client'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Track your progress and create new delivery requests.</p>
          </div>
          <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/20 shadow-inner">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_1fr]">
          {/* Create Order Form */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl xl:sticky xl:top-6 xl:h-fit">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
              <Package className="w-5 h-5 text-indigo-300" />
              New Delivery
            </h2>
            <p className="mb-5 text-sm text-slate-300">Fill in the pickup, drop, and package details for a fast dispatch.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Pickup Address</label>
                <div className="relative">
                  <MapPin className="absolute top-3 left-3 w-4 h-4 text-slate-400" />
                  <input type="text" className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 pl-10 pr-3 py-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-sm transition duration-200 focus:border-indigo-400 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="123 Start St" value={pickup} onChange={e => setPickup(e.target.value)} required />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Drop Address</label>
                <div className="relative">
                  <Navigation className="absolute top-3 left-3 w-4 h-4 text-slate-400" />
                  <input type="text" className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 pl-10 pr-3 py-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-sm transition duration-200 focus:border-indigo-400 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="456 End Ave" value={drop} onChange={e => setDrop(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Package Details</label>
                <textarea className="h-28 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-sm transition duration-200 focus:border-indigo-400 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Small box, fragile..." value={details} onChange={e => setDetails(e.target.value)} required></textarea>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Priority</label>
                <select className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 shadow-sm transition duration-200 focus:border-indigo-400 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {retryCountdown > 0 ? (
                <div className="w-full bg-red-50 text-red-700 p-3 rounded-lg flex items-center justify-center gap-2 mt-4 text-sm font-medium border border-red-200">
                  <AlertCircle className="w-4 h-4" />
                  No riders available. Retrying in {retryCountdown}s...
                </div>
              ) : (
                <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-500 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {loading ? 'Placing...' : 'Place Order'}
                </button>
              )}
            </form>
          </div>

          {/* Active Orders List */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Track Orders</h2>
                <p className="text-sm text-slate-300">Live status updates and progress checkpoints for every delivery.</p>
              </div>
            </div>
            <div className="space-y-4">
              {clientOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  You have not placed any orders yet.
                </div>
              ) : (
                clientOrders.map(order => (
                  <div key={order._id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg shadow-slate-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-slate-950">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400">#{order._id.substring(0,8).toUpperCase()}</span>
                        <h3 className="font-semibold text-slate-100">{order.packageDetails}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-6 ml-2 space-y-5 border-l-2 border-slate-800/80 pl-6 relative">
                      <div className="relative">
                        <div className="absolute w-3.5 h-3.5 bg-indigo-500 rounded-full -left-[1.4rem] top-1 border-4 border-slate-950 shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                        <p className="text-sm font-semibold text-slate-100">{order.pickupAddress}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5 uppercase tracking-wide">Pickup Location</p>
                      </div>
                      <div className="relative">
                        <div className="absolute w-3.5 h-3.5 bg-slate-600 rounded-full -left-[1.4rem] top-1 border-4 border-slate-950"></div>
                        <p className="text-sm font-semibold text-slate-100">{order.dropAddress}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5 uppercase tracking-wide">Drop Location</p>
                      </div>
                    </div>
                    
                    <OrderTracker currentStatus={order.status} failureReason={order.failureReason} failedByRiderName={order.failedByRiderName} />

                    {order.failureReason && order.status !== 'failed' && (
                      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex gap-3 shadow-inner">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <strong className="block mb-1 text-amber-300 font-semibold text-sm">Attempt by {order.failedByRiderName || 'Previous Rider'} failed: {order.failureReason}</strong>
                          <span className="text-amber-500/80">Auto-reassigned to:</span> <span className="font-bold text-amber-200">{(order.assignedRider as any)?.user?.name || 'a new rider'}</span>.
                        </div>
                      </div>
                    )}

                    {order.assignedRider && order.status !== 'pending' && order.status !== 'failed' && (
                      <div className="mt-10 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Assigned Rider: <strong className="text-indigo-400 ml-1">{(order.assignedRider as any).user?.name || 'Assigned'}</strong></span>
                        {order.priority === 'urgent' && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 uppercase tracking-widest shadow-[0_0_8px_rgba(239,68,68,0.2)]">URGENT</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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

const OrderTracker = ({ currentStatus, failureReason, failedByRiderName }: { currentStatus: string, failureReason?: string, failedByRiderName?: string }) => {
  const stages = [
    { id: 'pending', label: 'Pending' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'picked_up', label: 'Picked Up' },
    { id: 'delivered', label: 'Delivered' }
  ];

  if (currentStatus === 'failed') {
    return (
      <div className="mt-8 flex flex-col items-center justify-center p-5 bg-red-950/20 text-red-400 rounded-2xl border border-red-900/40 shadow-inner">
        <div className="flex items-center mb-3">
          <AlertCircle className="w-6 h-6 mr-2 animate-pulse text-red-500" />
          <span className="font-bold text-base tracking-wide uppercase">Delivery Failed</span>
        </div>
        {failureReason && (
          <div className="w-full text-center bg-red-950/40 py-3 px-4 rounded-xl text-sm font-medium border border-red-900/30 flex flex-col gap-1.5 mt-1 shadow-lg shadow-red-950/20">
            {failedByRiderName && <span className="text-red-300/80">Failed by: <strong className="text-red-200">{failedByRiderName}</strong></span>}
            <span className="text-red-300">Reason: <span className="text-red-100">{failureReason}</span></span>
          </div>
        )}
      </div>
    );
  }

  // Handle case where status doesn't exactly match timeline (shouldn't happen)
  let currentIndex = stages.findIndex(s => s.id === currentStatus);
  if (currentIndex === -1) currentIndex = 0;

  return (
    <div className="mt-10 pt-8 border-t border-slate-800/80 pb-6 px-4">
      <div className="flex justify-between items-center relative">
        {/* Background Track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full z-0"></div>
        {/* Active Track */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-indigo-500 rounded-full z-0 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(99,102,241,0.6)]"
          style={{ width: `calc(${(currentIndex / (stages.length - 1)) * 100}%)` }}
        ></div>
        
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isActive = idx === currentIndex;
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center group">
              <div className={`w-8 h-8 rounded-full border-[3px] flex items-center justify-center transition-all duration-500 ${
                isCompleted 
                  ? 'border-indigo-500 bg-slate-900 shadow-[0_0_16px_rgba(99,102,241,0.5)]' 
                  : 'border-slate-700 bg-slate-900'
              } ${isActive ? 'ring-4 ring-indigo-500/30 scale-110' : ''}`}>
                {isCompleted && <div className="w-3 h-3 bg-indigo-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]"></div>}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest absolute -bottom-8 whitespace-nowrap transition-colors duration-300 ${
                isActive ? 'text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' : isCompleted ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
