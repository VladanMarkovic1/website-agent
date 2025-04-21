import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, getAuthToken } from '../../context/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();
  const currentToken = getAuthToken();

  console.log('[ProtectedRoute] Check:', { 
      currentToken: !!currentToken,
      userRole: user?.role, 
      requiredRole 
  });

  if (!currentToken) {
    console.log('[ProtectedRoute] No token found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!user || user.role !== requiredRole)) {
    console.log(`[ProtectedRoute] Role mismatch (User: ${user?.role}, Required: ${requiredRole}), redirecting to /login`);
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Access granted.');
  return children;
};

export default ProtectedRoute;
