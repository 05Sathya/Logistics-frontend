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
    <div className="min-h-screen bg-[linear-gradient(145deg,#07111f_0%,#111827_35%,#312e81_70%,#111827_100%)] p-3 sm:p-6 lg:p-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">Client Portal</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">Welcome, {user?.name || 'Client'}</h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 sm:text-base">Track your progress and create new delivery requests.</p>
          </div>
          <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/20 shadow-inner">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_1fr]">
          {/* Create Order Form */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400">#{order._id.substring(0,8).toUpperCase()}</span>
                        <h3 className="font-semibold text-slate-100 mt-1">{order.packageDetails}</h3>
                      </div>
                      <div className="shrink-0 self-start">
                        <span className={`rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <OrderTracker order={order} />

                    {order.failureReason && order.status !== 'failed' && (
                      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-start gap-3 shadow-inner">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <strong className="block mb-1 text-amber-300 font-semibold text-sm break-words">Attempt by {order.failedByRiderName || 'Previous Rider'} failed: {order.failureReason}</strong>
                          <span className="text-amber-500/80">Auto-reassigned to:</span> <span className="font-bold text-amber-200">{(order.assignedRider as any)?.user?.name || 'a new rider'}</span>.
                        </div>
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

const OrderTracker = ({ order }: { order: any }) => {
  const currentStatus = order.status;
  
  const steps = [
    {
      id: 'pending',
      title: 'Order Placed',
      description: 'Waiting for rider assignment',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'assigned',
      title: 'Assigned to Rider',
      description: order.assignedRider ? `Assigned to ${(order.assignedRider as any)?.user?.name || 'a rider'}` : 'Rider is being assigned',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'picked_up',
      title: 'Package Picked Up',
      description: `From: ${order.pickupAddress}`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: `To: ${order.dropAddress}`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  ];

  if (currentStatus === 'failed') {
    steps[3] = {
      id: 'failed',
      title: 'Delivery Failed',
      description: order.failureReason ? `Reason: ${order.failureReason}` : 'Delivery was cancelled or failed',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    };
  }
  
  let currentIndex = steps.findIndex(s => s.id === currentStatus);
  if (currentIndex === -1) currentIndex = 0;
  
  return (
    <div className="mt-8">
      <div className="relative">
        {/* Background vertical line */}
        <div className="absolute left-[23px] top-[24px] bottom-[24px] w-0.5 bg-slate-800 rounded-full"></div>
        
        <div className="space-y-6">
          {steps.map((step, idx) => {
            const timelineStep = order.timeline?.find((t: any) => t.status === step.id);
            const isCompleted = idx < currentIndex || (idx === currentIndex && (currentStatus === 'delivered' || currentStatus === 'failed'));
            const isCurrent = idx === currentIndex && currentStatus !== 'delivered' && currentStatus !== 'failed';
            
            // Generate styles explicitly for tailwind
            let circleStyle = "border-slate-800 bg-slate-900 text-slate-600";
            if (isCurrent) {
              circleStyle = "border-indigo-500/30 bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]";
            } else if (isCompleted) {
              if (step.id === 'failed') {
                circleStyle = "border-slate-900 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]";
              } else if (step.id === 'delivered') {
                circleStyle = "border-slate-900 bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]";
              } else {
                circleStyle = "border-slate-900 bg-emerald-500 text-white";
              }
            }

            return (
              <div key={step.id} className="relative z-10 flex gap-5">
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shrink-0 transition-all duration-300 ${circleStyle}`}>
                   {step.icon}
                </div>
                
                <div className="flex-1 pb-1 pt-1">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                     <h4 className={`text-base font-bold break-words pr-2 ${isCurrent || isCompleted ? (step.id === 'failed' ? 'text-red-400' : 'text-slate-100') : 'text-slate-500'}`}>
                       {step.title}
                     </h4>
                     
                     <div className="shrink-0 flex items-center">
                       {isCompleted && step.id !== 'failed' && (
                         <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wide shrink-0">
                           ✓ Done
                         </span>
                       )}
                       {isCurrent && (
                         <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wide shrink-0">
                           Current
                         </span>
                       )}
                       {step.id === 'failed' && isCompleted && (
                         <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wide shrink-0">
                           Failed
                         </span>
                       )}
                     </div>
                   </div>
                   
                   <p className={`text-sm mt-1 sm:mt-0.5 break-words ${isCurrent || isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                     {step.description}
                   </p>
                   
                   {timelineStep && (
                     <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                       {new Date(timelineStep.timestamp).toLocaleString(undefined, {
                         day: '2-digit', month: 'short', year: 'numeric',
                         hour: '2-digit', minute: '2-digit', second: '2-digit'
                       })}
                     </p>
                   )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};
