import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/LoginPage';
import Register from './pages/RegistrationPage';
import Dashboard from './pages/BusinessOwnerPage';
import Leads from './components/leads/Leads';
import Services from './components/services/Services';
import Settings from './components/settings/Settings';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/auth/ProtectedRoutes';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import { AuthProvider } from './context/AuthContext';
// Phase 4: Call Tracking Dashboard - Integrated
import CallTrackingPage from './pages/CallTrackingPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <AuthProvider>
        <Routes future={{ v7_relativeSplatPath: true }}>
          {/* Public Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
         
          {/* Protected Dashboard Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          >
            {/* Nested Dashboard Routes */}
            <Route index element={<Navigate to="/dashboard/leads" replace />} />
            <Route path="leads" element={<Leads />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="call-tracking/*" element={<CallTrackingPage />} />
            <Route path="services" element={<Services />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Protected Admin Route */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            } 
          />

          {/* Legacy: Keep test route for reference but redirect to main dashboard */}
          <Route path="/call-tracking-test/*" element={<Navigate to="/dashboard/call-tracking" replace />} />
          
          {/* Redirect root to login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Redirect any unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
