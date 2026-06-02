import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Package, MapPin, Navigation, Send, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import type { AppDispatch, RootState } from '../store/store';
import { fetchClientOrders, showToast } from '../store/logisticsSlice';

export const ClientOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { clientOrders } = useSelector((state: RootState) => state.logistics);
  
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

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
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">Client Portal</p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">My Orders</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Create, monitor, and manage all outgoing deliveries in one polished, responsive workspace.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-3xl bg-slate-950/80 p-4 text-white shadow-inner ring-1 ring-slate-800 sm:min-w-[300px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Open Orders</p>
                <p className="mt-1 text-2xl font-bold text-indigo-100">{clientOrders.filter(order => order.status !== 'delivered' && order.status !== 'failed').length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Delivered</p>
                <p className="mt-1 text-2xl font-bold text-emerald-100">{clientOrders.filter(order => order.status === 'delivered').length}</p>
              </div>
            </div>
          </div>
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
              <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">Responsive</span>
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
                    
                    <div className="mt-4 ml-1 space-y-4 border-l-2 border-slate-800 pl-6">
                      <div className="relative">
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[1.1rem] top-1 border-2 border-white"></div>
                        <p className="text-sm font-medium text-slate-100">{order.pickupAddress}</p>
                        <p className="text-xs text-slate-300">Pickup Location</p>
                      </div>
                      <div className="relative">
                        <div className="absolute w-3 h-3 bg-slate-200 rounded-full -left-[1.1rem] top-1 border-2 border-white"></div>
                        <p className="text-sm font-medium text-slate-100">{order.dropAddress}</p>
                        <p className="text-xs text-slate-300">Drop Location</p>
                      </div>
                    </div>
                    
                    <OrderTracker currentStatus={order.status} failureReason={order.failureReason} failedByRiderName={order.failedByRiderName} />

                    {order.failureReason && order.status !== 'failed' && (
                      <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-0.5">Attempt by {order.failedByRiderName || 'Previous Rider'} failed: {order.failureReason}</strong>
                          Auto-reassigned to: <span className="font-bold">{(order.assignedRider as any)?.user?.name || 'a new rider'}</span>.
                        </div>
                      </div>
                    )}

                    {order.assignedRider && order.status !== 'pending' && order.status !== 'failed' && (
                      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Assigned Rider: <strong className="text-slate-700">{(order.assignedRider as any).user?.name || 'Assigned'}</strong></span>
                        {order.priority === 'urgent' && <span className="text-xs font-bold text-red-500">URGENT</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
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
      <div className="mt-6 flex flex-col items-center justify-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-bold text-sm">Delivery Failed</span>
        </div>
        {failureReason && (
          <div className="w-full text-center bg-white/60 py-2 px-3 rounded text-xs font-medium border border-red-100 flex flex-col gap-1">
            {failedByRiderName && <span>Failed by: <strong>{failedByRiderName}</strong></span>}
            <span>Reason: {failureReason}</span>
          </div>
        )}
      </div>
    );
  }

  // Handle case where status doesn't exactly match timeline (shouldn't happen)
  let currentIndex = stages.findIndex(s => s.id === currentStatus);
  if (currentIndex === -1) currentIndex = 0;

  return (
    <div className="mt-6 pt-6 border-t border-slate-100 pb-4">
      <div className="flex justify-between items-center relative px-2">
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0"></div>
        <div 
          className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - 16px)` }}
        ></div>
        
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isActive = idx === currentIndex;
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors bg-white ${
                isCompleted 
                  ? 'border-primary' 
                  : 'border-slate-200'
              } ${isActive ? 'ring-4 ring-primary/20' : ''}`}>
                {isCompleted && <div className="w-2 h-2 bg-primary rounded-full"></div>}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider absolute -bottom-6 whitespace-nowrap ${
                isActive ? 'text-primary' : isCompleted ? 'text-slate-700' : 'text-slate-400'
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
