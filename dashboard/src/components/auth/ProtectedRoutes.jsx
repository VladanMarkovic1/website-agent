import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useAuth();

  // console.log('[ProtectedRoute] Check:', { 
  //     hasToken: !!token,
  //     userRole: user?.role, 
  //     requiredRole 
  // }); // REMOVED

  if (!token) {
    // console.log('[ProtectedRoute] No token found in context, redirecting to /login'); // REMOVED
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!user || user.role !== requiredRole)) {
    // console.log(`[ProtectedRoute] Role mismatch (User: ${user?.role}, Required: ${requiredRole}), redirecting to /login`); // REMOVED
    return <Navigate to="/login" replace />;
  }

  // console.log('[ProtectedRoute] Access granted.'); // REMOVED
  return children;
};

export default ProtectedRoute;
