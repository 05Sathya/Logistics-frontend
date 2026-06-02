export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'rider';
}

export interface Rider {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'available' | 'busy' | 'offline';
  activeOrders: number;
  totalDelivered: number;
  totalFailed: number;
  avgDeliveryTime: number;
}

export interface OrderTimelineStep {
  status: string;
  timestamp: string;
}

export interface Order {
  _id: string;
  client: {
    _id: string;
    name: string;
    email: string;
  };
  assignedRider?: Rider;
  pickupAddress: string;
  dropAddress: string;
  packageDetails: string;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'failed';
  proofPhoto?: string;
  failureReason?: string;
  failedByRiderName?: string;
  timeTaken?: number;
  timeline: OrderTimelineStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalOrders: number;
  delivered: number;
  failed: number;
  pending: number;
  avgDeliveryTime: number;
  successRate: number;
  peakHour: string;
  riderPerformance: Array<{
    riderName: string;
    delivered: number;
    failed: number;
    avgTime: number;
    rating: number;
  }>;
  zoneWiseSummary: Array<{
    zone: string;
    totalOrders: number;
    successRate: number;
  }>;
}
