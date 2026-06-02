import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../store/store';
import { logout } from '../store/authSlice';
import {
  fetchAdminOrders,
  fetchAdminRiders,
  fetchAnalyticsSummary,
  updateRiderStatus,
} from '../store/logisticsSlice';
import {
  Package,
  Users,
  Activity,
  Clock,
  LogOut,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { socketService } from '../services/socket';
import type { Order, Rider } from '../store/types';

export const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // State slices
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    adminStats,
    adminOrders,
    adminRiders,
    loading,
  } = useSelector((state: RootState) => state.logistics);

  // Component UI State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [offlineModalRider, setOfflineModalRider] = useState<Rider | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    loadData();
    
    // Set up listeners for socket updates to reload summary / lists on assignments/status changes
    socketService.on('order_assigned', () => {
      dispatch(fetchAnalyticsSummary());
      dispatch(fetchAdminRiders());
      dispatch(fetchAdminOrders({ status: filterStatus, priority: filterPriority, zone: filterZone, page }));
    });
    socketService.on('order_status_change', () => {
      dispatch(fetchAnalyticsSummary());
      dispatch(fetchAdminRiders());
      dispatch(fetchAdminOrders({ status: filterStatus, priority: filterPriority, zone: filterZone, page }));
    });
    socketService.on('rider_offline', () => {
      dispatch(fetchAnalyticsSummary());
      dispatch(fetchAdminRiders());
      dispatch(fetchAdminOrders({ status: filterStatus, priority: filterPriority, zone: filterZone, page }));
    });

    return () => {
      socketService.off('order_assigned');
      socketService.off('order_status_change');
      socketService.off('rider_offline');
    };
  }, [dispatch, filterStatus, filterPriority, filterZone, page]);

  const loadData = () => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchAdminRiders());
    dispatch(fetchAdminOrders({ status: filterStatus, priority: filterPriority, zone: filterZone, page }));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleRiderToggle = (rider: Rider) => {
    if (rider.status !== 'offline') {
      // If going offline, check if rider has active orders
      if (rider.activeOrders > 0) {
        setOfflineModalRider(rider);
      } else {
        dispatch(updateRiderStatus({ riderId: rider._id, status: 'offline' }));
      }
    } else {
      // If going online
      dispatch(updateRiderStatus({ riderId: rider._id, status: 'available' }));
    }
  };

  const confirmOfflineRider = () => {
    if (offlineModalRider) {
      dispatch(updateRiderStatus({ riderId: offlineModalRider._id, status: 'offline' }));
      setOfflineModalRider(null);
    }
  };

  const getRiderStatusDotColor = (status: 'available' | 'busy' | 'offline') => {
    if (status === 'available') return 'bg-emerald-500 shadow-emerald-500/50';
    if (status === 'busy') return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-slate-500 shadow-slate-500/50';
  };

  const toggleRowExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const calculateTimeElapsed = (createdAtStr: string): string => {
    const start = new Date(createdAtStr).getTime();
    const mins = Math.max(0, Math.round((Date.now() - start) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ago`;
  };

  // Recharts Chart Formatting
  const zoneChartData = adminStats?.zoneWiseSummary.map(z => ({
    name: z.zone,
    orders: z.totalOrders,
    success: z.successRate,
  })) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Antigravity Logistics
            </h1>
            <p className="text-slate-400 text-xs font-semibold">Live Admin Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all border border-slate-800/60"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800/80">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 font-bold capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Real-time statistics summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Orders',
              value: adminStats?.totalOrders ?? '0',
              sub: 'Total placed',
              icon: Package,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10 border-indigo-500/20',
            },
            {
              label: 'Active Riders',
              value: adminRiders.filter(r => r.status !== 'offline').length.toString(),
              sub: `${adminRiders.filter(r => r.status === 'available').length} Available`,
              icon: Users,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Delivery Success Rate',
              value: `${adminStats?.successRate ?? '0'}%`,
              sub: `Delivered vs Failed`,
              icon: Activity,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Avg Delivery Time',
              value: `${adminStats?.avgDeliveryTime ?? '0'} mins`,
              sub: 'Completion speed',
              icon: Clock,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border ${card.bg} flex items-center justify-between transition-all hover:scale-[1.02]`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-400">{card.label}</p>
                <h3 className="text-2xl font-bold text-slate-100 mt-1">{card.value}</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{card.sub}</p>
              </div>
              <div className={`p-3 bg-slate-950/60 rounded-xl border border-slate-800 ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Orders List Table */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                  Active Operations
                </h2>
                <p className="text-xs text-slate-400">Live order logs & status tracking</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterPriority}
                  onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
                <input
                  type="text"
                  placeholder="Filter zone..."
                  value={filterZone}
                  onChange={(e) => { setFilterZone(e.target.value); setPage(1); }}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none max-w-[120px]"
                />
              </div>
            </div>

            {loading && adminOrders.length === 0 ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
              </div>
            ) : adminOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-semibold">No Orders Registered</p>
                <p className="text-xs mt-1">Orders placed by clients will appear here.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Rider</th>
                        <th className="py-3 px-4 text-center">Priority</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Elapsed</th>
                        <th className="py-3 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrders.map((order: Order) => {
                        const isExpanded = expandedOrderId === order._id;
                        // Color coding border rules
                        let borderStyle = 'border-l-transparent';
                        if (order.priority === 'urgent') borderStyle = 'border-l-4 border-l-red-500';
                        else if (order.status === 'delivered') borderStyle = 'border-l-4 border-l-emerald-500';

                        // Failed strikethrough text styles
                        const isFailed = order.status === 'failed';
                        const textStyle = isFailed ? 'line-through text-red-500/70' : '';

                        return (
                          <React.Fragment key={order._id}>
                            <tr
                              onClick={() => toggleRowExpansion(order._id)}
                              className={`border-b border-slate-850 hover:bg-slate-800/20 cursor-pointer transition-colors ${borderStyle}`}
                            >
                              <td className="py-3.5 px-4 text-xs font-bold text-slate-300">
                                #{order._id.slice(-6).toUpperCase()}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                                {order.client?.name || 'Client'}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-medium text-slate-400">
                                {order.assignedRider?.user?.name || (
                                  <span className="text-slate-600">Unassigned</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Badge variant={order.priority === 'urgent' ? 'danger' : 'neutral'}>
                                  {order.priority}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Badge
                                  variant={
                                    order.status === 'delivered'
                                      ? 'success'
                                      : order.status === 'failed'
                                      ? 'danger'
                                      : order.status === 'picked_up'
                                      ? 'warning'
                                      : order.status === 'assigned'
                                      ? 'primary'
                                      : 'neutral'
                                  }
                                >
                                  {order.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className={`py-3.5 px-4 text-right text-xs text-slate-400 font-semibold ${textStyle}`}>
                                {calculateTimeElapsed(order.createdAt)}
                              </td>
                              <td className="py-3.5 px-2 text-slate-500">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </td>
                            </tr>

                            {/* Inline Collapsible timeline view */}
                            {isExpanded && (
                              <tr className="bg-slate-950/40">
                                <td colSpan={7} className="px-6 py-4 border-b border-slate-850">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row gap-6 justify-between border-b border-slate-800/40 pb-3">
                                      <div>
                                        <p className="text-xs text-slate-400 font-bold">Pickup Address</p>
                                        <p className="text-xs text-slate-200 mt-1">{order.pickupAddress}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-400 font-bold">Drop Address</p>
                                        <p className="text-xs text-slate-200 mt-1">{order.dropAddress}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-400 font-bold">Package Details</p>
                                        <p className="text-xs text-slate-200 mt-1">{order.packageDetails}</p>
                                      </div>
                                    </div>

                                    {/* Timeline Stages */}
                                    <div className="py-2">
                                      <p className="text-xs font-bold text-slate-400 mb-3">Order History Log</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {['pending', 'assigned', 'picked_up', 'delivered', 'failed'].map((stage, sIdx) => {
                                          const step = order.timeline.find(t => t.status === stage);
                                          const isFailed = order.status === 'failed';

                                          // Skip failed stage if stage is delivered, or skip delivered stage if failed
                                          if (stage === 'delivered' && isFailed) return null;
                                          if (stage === 'failed' && !isFailed && order.status !== 'pending') return null;

                                          const isCompleted = !!step;

                                          return (
                                            <div
                                              key={sIdx}
                                              className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                                                isCompleted
                                                  ? stage === 'delivered'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                                    : stage === 'failed'
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                                                  : 'bg-slate-900/20 border-slate-800/40 text-slate-500'
                                              }`}
                                            >
                                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                                {stage.replace('_', ' ')}
                                              </span>
                                              <span className="text-[10px] font-semibold text-slate-400">
                                                {isCompleted
                                                  ? new Date(step.timestamp).toLocaleTimeString([], {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })
                                                  : 'Pending'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {order.failureReason && (
                                      <div className="bg-red-950/20 border border-red-500/10 p-3 rounded-xl">
                                        <p className="text-[10px] uppercase font-bold text-red-400">Failure Reason</p>
                                        <p className="text-xs mt-0.5 text-red-200">{order.failureReason}</p>
                                      </div>
                                    )}

                                    {order.proofPhoto && (
                                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl w-fit">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Delivery Proof Photo</p>
                                        <img src={order.proofPhoto} alt="Delivery Proof" className="max-w-[200px] rounded-lg border border-slate-800" />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Rider Status Sidebar */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Fleet Control
              </h2>
              <p className="text-xs text-slate-400">Manage online riders & active queues</p>
            </div>

            {adminRiders.length === 0 ? (
              <div className="py-12 text-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-sm font-semibold">No Riders Registered</p>
                <p className="text-xs mt-1">Riders registering on platform will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {adminRiders.map((rider) => {
                  const isOffline = rider.status === 'offline';
                  const isBusy = rider.activeOrders > 0;
                  const displayStatus = isOffline ? 'offline' : isBusy ? 'busy' : 'available';
                  const dotColor = getRiderStatusDotColor(displayStatus);

                  return (
                    <div
                      key={rider._id}
                      className="flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl border border-slate-800/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{rider.user?.name || 'Rider'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                            {rider.activeOrders} active orders
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRiderToggle(rider)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          isOffline
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        {isOffline ? 'Go Online' : 'Set Offline'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Analytics charts panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharts Volume Chart */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Volume By Zone
              </h2>
              <p className="text-xs text-slate-400">Order distribution across logistics districts</p>
            </div>
            
            <div className="h-64 w-full">
              {zoneChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-650">
                  <p className="text-xs font-semibold">No zone analytics available yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="orders" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Rider performance table */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-100">Performance Leaderboard</h2>
              <p className="text-xs text-slate-400">Fulfillment metrics across active riders</p>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {!adminStats?.riderPerformance || adminStats.riderPerformance.length === 0 ? (
                <div className="py-12 text-center text-slate-600">
                  <p className="text-xs font-semibold">No performance data compiled</p>
                </div>
              ) : (
                adminStats.riderPerformance.map((perf, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/20 border border-slate-850">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{perf.riderName}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-emerald-400 font-bold">{perf.delivered} Delivered</span>
                        <span className="text-[9px] text-red-400 font-bold">{perf.failed} Failed</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-400">{perf.avgTime}m avg</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Rating: ⭐ {perf.rating}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for toggling rider offline with active orders */}
      <Modal
        isOpen={!!offlineModalRider}
        onClose={() => setOfflineModalRider(null)}
        title="Rider Deactivation Alert"
        footer={
          <>
            <Button variant="outline" onClick={() => setOfflineModalRider(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmOfflineRider}>
              Confirm Offline
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">
            Rider <strong className="text-slate-800">{offlineModalRider?.user?.name}</strong> has{' '}
            <strong className="text-indigo-600">{offlineModalRider?.activeOrders} active orders</strong> in progress.
          </p>
          <p className="text-xs leading-relaxed text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <strong>Warning:</strong> Forcing this rider offline will automatically trigger order reassignment to other online available riders. If no other riders are online, the orders will revert to <strong>pending</strong> status.
          </p>
        </div>
      </Modal>
    </div>
  );
};
