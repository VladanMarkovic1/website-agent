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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true }}>
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
            <Route path="services" element={<Services />} />
            <Route path="settings" element={<Settings />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
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
          
          {/* Redirect root to login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Redirect any unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
