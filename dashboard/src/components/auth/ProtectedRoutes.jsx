import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(localStorage.getItem('user')) : null;

  // If no token is present, redirect to login.
  if (!token) {
    return <Navigate to="/login" />;
  }

  // If a required role is provided, ensure the logged-in user matches it.
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/login" />;
  }

  // Otherwise, render the child component(s).
  return children;
};

export default ProtectedRoute;
