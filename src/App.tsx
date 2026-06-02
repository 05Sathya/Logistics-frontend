import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store, type RootState } from './store/store';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientOrders } from './pages/ClientOrders';
import { RiderDeliveries } from './pages/RiderDeliveries';
import { Toast } from './components/Toast';

// Strictly typed Protected Route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  role: 'admin' | 'client' | 'rider';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'client') return <Navigate to="/orders" replace />;
    if (user.role === 'rider') return <Navigate to="/my-deliveries" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute role="client">
              <ClientOrders />
            </ProtectedRoute>
          } />
          
          <Route path="/my-deliveries" element={
            <ProtectedRoute role="rider">
              <RiderDeliveries />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      {/* Render Toast alerts globally */}
      <Toast />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
