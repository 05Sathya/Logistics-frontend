import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import type { Order, Rider, AnalyticsSummary, User } from './types';

interface LogisticsState {
  adminStats: AnalyticsSummary | null;
  adminOrders: Order[];
  adminOrdersTotal: number;
  adminOrdersPage: number;
  adminOrdersPages: number;
  adminRiders: Rider[];
  adminClients: User[];
  clientOrders: Order[];
  riderOrders: Order[];
  loading: boolean;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const initialState: LogisticsState = {
  adminStats: null,
  adminOrders: [],
  adminOrdersTotal: 0,
  adminOrdersPage: 1,
  adminOrdersPages: 1,
  adminRiders: [],
  adminClients: [],
  clientOrders: [],
  riderOrders: [],
  loading: false,
  error: null,
  toast: null,
};

// Async Thunks
export const placeOrder = createAsyncThunk(
  'logistics/placeOrder',
  async (
    orderData: { pickupAddress: string; dropAddress: string; packageDetails: string; priority: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post<Order>('/orders', orderData);
      return response.data;
    } catch (err: any) {
      if (err.response && err.response.status === 503) {
        return rejectWithValue({ statusCode: 503, retryAfter: err.response.data.retryAfter || 60 });
      }
      return rejectWithValue(err.response?.data?.message || 'Failed to place order');
    }
  }
);

export const fetchClientOrders = createAsyncThunk(
  'logistics/fetchClientOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Order[]>('/orders/my');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch client orders');
    }
  }
);

export const fetchRiderOrders = createAsyncThunk(
  'logistics/fetchRiderOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Order[]>('/orders/rider/my');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch rider orders');
    }
  }
);

export const fetchAdminOrders = createAsyncThunk(
  'logistics/fetchAdminOrders',
  async (
    filters: { status?: string; priority?: string; zone?: string; page?: number; limit?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.zone) queryParams.append('zone', filters.zone);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const response = await api.get<{
        orders: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/orders?${queryParams.toString()}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch admin orders');
    }
  }
);

export const fetchAdminRiders = createAsyncThunk(
  'logistics/fetchAdminRiders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Rider[]>('/riders');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch admin riders');
    }
  }
);

export const fetchAdminClients = createAsyncThunk(
  'logistics/fetchAdminClients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<User[]>('/users/clients');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch admin clients');
    }
  }
);

export const updateRiderStatus = createAsyncThunk(
  'logistics/updateRiderStatus',
  async ({ riderId, status }: { riderId: string; status: 'available' | 'offline' }, { rejectWithValue }) => {
    try {
      const response = await api.patch<Rider>(`/riders/${riderId}/status`, { status });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update rider status');
    }
  }
);

export const fetchAnalyticsSummary = createAsyncThunk(
  'logistics/fetchAnalyticsSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<AnalyticsSummary>('/analytics/summary');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch analytics summary');
    }
  }
);

export const updateOrderDeliveryStatus = createAsyncThunk(
  'logistics/updateOrderDeliveryStatus',
  async (
    { orderId, status, proofPhoto, failureReason }: { orderId: string; status: string; proofPhoto?: string; failureReason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch<Order>(`/orders/${orderId}/status`, { status, proofPhoto, failureReason });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update delivery status');
    }
  }
);

export const sendLocationUpdate = createAsyncThunk(
  'logistics/sendLocationUpdate',
  async ({ lat, lng }: { lat: number; lng: number }, { rejectWithValue }) => {
    try {
      const response = await api.patch<{ success: boolean }>('/riders/location', { lat, lng });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send location update');
    }
  }
);

const logisticsSlice = createSlice({
  name: 'logistics',
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) => {
      state.toast = action.payload;
    },
    hideToast: (state) => {
      state.toast = null;
    },
    // Real-time socket event updates
    handleOrderAssignedEvent: (state, action: PayloadAction<{ orderId: string; riderName: string; estimatedTime: string }>) => {
      const { orderId, riderName, estimatedTime } = action.payload;
      
      // Update client orders list
      state.clientOrders = state.clientOrders.map((o) => {
        if (o._id === orderId) {
          return {
            ...o,
            status: 'assigned',
            timeline: [...o.timeline, { status: 'assigned', timestamp: new Date().toISOString() }],
          };
        }
        return o;
      });

      // Update admin orders list
      state.adminOrders = state.adminOrders.map((o) => {
        if (o._id === orderId) {
          return {
            ...o,
            status: 'assigned',
            timeline: [...o.timeline, { status: 'assigned', timestamp: new Date().toISOString() }],
          };
        }
        return o;
      });

      // If matching rider name, we show assigned alert
      state.toast = {
        message: `Order assigned to ${riderName}! (Est: ${estimatedTime})`,
        type: 'info',
      };
    },
    handleOrderStatusChangeEvent: (state, action: PayloadAction<{ orderId: string; status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'failed'; timestamp: string }>) => {
      const { orderId, status, timestamp } = action.payload;

      const updateList = (orders: Order[]) =>
        orders.map((o) => {
          if (o._id === orderId) {
            // Avoid duplicate status timeline steps
            const alreadyExists = o.timeline.some((t) => t.status === status);
            const nextTimeline = alreadyExists
              ? o.timeline
              : [...o.timeline, { status, timestamp }];

            return {
              ...o,
              status,
              timeline: nextTimeline,
            };
          }
          return o;
        });

      state.clientOrders = updateList(state.clientOrders);
      state.adminOrders = updateList(state.adminOrders);
      state.riderOrders = updateList(state.riderOrders);

      // Triggers specific toast triggers
      if (status === 'delivered') {
        state.toast = {
          message: `Your order has been delivered! 🎉`,
          type: 'success',
        };
      }
    },
    handleRiderOfflineEvent: (state, action: PayloadAction<{ riderId: string; reassignedOrders: number }>) => {
      const { riderId, reassignedOrders } = action.payload;
      state.adminRiders = state.adminRiders.map((r) => {
        if (r._id === riderId) {
          return {
            ...r,
            status: 'offline',
            activeOrders: 0,
          };
        }
        return r;
      });

      state.toast = {
        message: `Rider went offline. Reassigned ${reassignedOrders} orders.`,
        type: 'info',
      };
    },
    handleLocationUpdateEvent: (_state, action: PayloadAction<{ riderId: string; lat: number; lng: number }>) => {
      // For Admin dashboard tracker or local states
      console.log(`Live coordinate update: Rider ${action.payload.riderId} - Lat: ${action.payload.lat}, Lng: ${action.payload.lng}`);
    },
  },
  extraReducers: (builder) => {
    builder
      // placeOrder
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        state.clientOrders.unshift(action.payload);
        state.toast = { message: 'Order placed successfully!', type: 'success' };
      })
      .addCase(placeOrder.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchClientOrders
      .addCase(fetchClientOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.loading = false;
        state.clientOrders = action.payload;
      })
      .addCase(fetchClientOrders.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload, type: 'error' };
      })
      // fetchRiderOrders
      .addCase(fetchRiderOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRiderOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.loading = false;
        state.riderOrders = action.payload;
      })
      .addCase(fetchRiderOrders.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload, type: 'error' };
      })
      // fetchAdminOrders
      .addCase(fetchAdminOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.adminOrders = action.payload.orders;
        state.adminOrdersTotal = action.payload.total;
        state.adminOrdersPage = action.payload.page;
        state.adminOrdersPages = action.payload.totalPages;
      })
      .addCase(fetchAdminOrders.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchAdminRiders
      .addCase(fetchAdminRiders.fulfilled, (state, action: PayloadAction<Rider[]>) => {
        state.adminRiders = action.payload;
      })

      // fetchAdminClients
      .addCase(fetchAdminClients.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.adminClients = action.payload;
      })

      // fetchAnalyticsSummary
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action: PayloadAction<AnalyticsSummary>) => {
        state.adminStats = action.payload;
      })

      // updateOrderDeliveryStatus
      .addCase(updateOrderDeliveryStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOrderDeliveryStatus.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        state.toast = { message: `Order status updated to ${action.payload.status}`, type: 'success' };
        
        // Refresh local lists
        state.riderOrders = state.riderOrders.map((o) => (o._id === action.payload._id ? action.payload : o));
      })
      .addCase(updateOrderDeliveryStatus.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.toast = { message: action.payload, type: 'error' };
      })

      // updateRiderStatus
      .addCase(updateRiderStatus.fulfilled, (state, action: PayloadAction<Rider>) => {
        state.adminRiders = state.adminRiders.map((r) => (r._id === action.payload._id ? action.payload : r));
        state.toast = { message: `Rider availability set to ${action.payload.status}`, type: 'success' };
      })
      .addCase(updateRiderStatus.rejected, (state, action: PayloadAction<any>) => {
        state.toast = { message: action.payload, type: 'error' };
      });
  },
});

export const {
  showToast,
  hideToast,
  handleOrderAssignedEvent,
  handleOrderStatusChangeEvent,
  handleRiderOfflineEvent,
  handleLocationUpdateEvent,
} = logisticsSlice.actions;

export default logisticsSlice.reducer;
