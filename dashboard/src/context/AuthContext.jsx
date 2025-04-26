import React, { createContext, useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/authService'; // Ensure this path is correct

// Store the token outside React state for access by interceptors
// let currentToken = null; // Remove this
// console.log('[AuthContext] Initial load: currentToken =', currentToken); // REMOVED

// Export a function to get the current token
/* // Remove this entire function
export const getAuthToken = () => {
  // console.log('[AuthContext] getAuthToken() called, returning:', currentToken); // REMOVED
  return currentToken;
};
*/

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Effect to load user data if token exists
  useEffect(() => {
    // console.log('[AuthContext] Initial token check:', token); // REMOVED
    if (token) {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // console.log('[AuthContext] User loaded from sessionStorage:', parsedUser); // REMOVED
        } catch (e) {
          console.error('[AuthContext] Failed to parse user from sessionStorage:', e);
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
    } else {
      // console.log('[AuthContext] No token found initially.'); // REMOVED
      setUser(null); // Ensure user is null if no token
    }
  }, [token]); // Depend on token to re-run if it changes externally (though unlikely with sessionStorage)

  // Login function
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    // console.log('[AuthContext] Attempting login with credentials:', credentials); // REMOVED
    try {
      const response = await loginUser(credentials);
      // console.log('[AuthContext] Login response:', response); // REMOVED
      if (response && response.token) {
        // Set token state first
        setToken(response.token); 
        setUser(response.user);
        sessionStorage.setItem('token', response.token); // Persist token
        sessionStorage.setItem('user', JSON.stringify(response.user)); // Persist user data
        // currentToken = response.token; // No longer needed
        // console.log('[AuthContext] Login successful. Token and user set.'); // REMOVED
        // --- Role-based redirection ---
        if (response.user && response.user.role === 'admin') {
          // console.log('[AuthContext] Admin user detected, redirecting to /admin'); // REMOVED
          navigate('/admin');
        } else {
          // console.log('[AuthContext] Non-admin user detected, redirecting to /dashboard'); // REMOVED
          navigate('/dashboard'); // Redirect non-admins to dashboard
        }
        // --- End Role-based redirection ---
      } else {
        throw new Error(response.message || 'Login failed: No token received');
      }
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      setError(err.message || 'Failed to login');
      sessionStorage.removeItem('token'); // Clear token on failure
      sessionStorage.removeItem('user');  // Clear user data on failure
      setToken(null);
      setUser(null);
      // currentToken = null; // No longer needed
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Logout function
  const logout = useCallback(() => {
    // console.log('[AuthContext] Logging out.'); // REMOVED
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token'); // Clear token from storage
    sessionStorage.removeItem('user'); // Clear user data from storage
    // currentToken = null; // No longer needed
    navigate('/login'); // Redirect to login page after logout
    // console.log('[AuthContext] Logout complete. Token and user cleared.'); // REMOVED
  }, [navigate]);

  // Registration function
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    // console.log('[AuthContext] Attempting registration with data:', userData); // REMOVED
    try {
      const response = await registerUser(userData);
      // console.log('[AuthContext] Registration response:', response); // REMOVED
      // Assuming registration automatically logs the user in or requires separate login:
      // If auto-login:
      if (response && response.token) {
        setToken(response.token);
        setUser(response.user);
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        // currentToken = response.token; // No longer needed
        // console.log('[AuthContext] Registration successful and logged in.'); // REMOVED
        navigate('/dashboard'); // Redirect to dashboard
      } else {
        // If registration does NOT auto-login, maybe redirect to login page
        // console.log('[AuthContext] Registration successful. Please log in.'); // REMOVED
        navigate('/login'); 
        // Or display a success message
      }
      // If registration failed within the service (e.g., user exists), it should throw an error

    } catch (err) {
      console.error('[AuthContext] Registration error:', err);
      setError(err.message || 'Failed to register');
      // Ensure state is clean if registration fails
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setToken(null);
      setUser(null);
      // currentToken = null; // No longer needed
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Value provided to context consumers
  const value = {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!token, // Boolean flag for authentication status
    login,
    logout,
    register,
  };
  // console.log('[AuthContext] Provider rendering with value:', { isAuthenticated: value.isAuthenticated, isLoading, error }); // REMOVED

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  // console.log('[AuthContext] useAuth() hook called.'); // REMOVED
  const context = useContext(AuthContext);
  if (context === undefined || context === null) { 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 