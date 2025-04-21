import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';

// Store the token outside React state for access by interceptors
let currentToken = null;
console.log('[AuthContext] Initial load: currentToken =', currentToken);

// Export a function to get the current token
export const getAuthToken = () => {
  console.log('[AuthContext] getAuthToken() called, returning:', currentToken);
  return currentToken;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = sessionStorage.getItem('token');
    console.log('[AuthContext] Initializing token state from sessionStorage:', storedToken);
    // Synchronize initial external token variable if found in sessionStorage
    currentToken = storedToken;
    return storedToken;
  });
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('user');
    console.log('[AuthContext] Initializing user state from sessionStorage:', storedUser ? 'found' : 'not found');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("[AuthContext] Failed to parse user from sessionStorage", e);
      sessionStorage.removeItem('user'); 
      return null;
    }
  });

  // Effect to synchronize state with sessionStorage AND the external variable
  useEffect(() => {
    console.log('[AuthContext] useEffect triggered. Current token state:', token);
    if (token) {
      console.log('[AuthContext] useEffect: Setting sessionStorage token and currentToken.');
      sessionStorage.setItem('token', token);
      currentToken = token; // Update external variable
    } else {
      console.log('[AuthContext] useEffect: Removing sessionStorage token and clearing currentToken.');
      sessionStorage.removeItem('token');
      currentToken = null; // Clear external variable
    }
    if (user) {
      // console.log('[AuthContext] useEffect: Setting sessionStorage user.');
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      // console.log('[AuthContext] useEffect: Removing sessionStorage user.');
      sessionStorage.removeItem('user');
    }
  }, [token, user]);

  const login = (newToken, newUser) => {
    console.log('[AuthContext] login() called. Setting currentToken synchronously.');
    currentToken = newToken;
    console.log('[AuthContext] login: currentToken is now:', currentToken);
    console.log('[AuthContext] login: Calling setToken and setUser (async state update)...');
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    console.log('[AuthContext] logout() called. Clearing currentToken synchronously.');
    currentToken = null;
    console.log('[AuthContext] logout: currentToken is now:', currentToken);
    console.log('[AuthContext] logout: Calling setToken(null) and setUser(null) (async state update)...');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => {
    console.log('[AuthContext] useMemo recalculating context value. Token state:', token);
    return {
      token,
      user,
      isAuthenticated: !!token,
      login,
      logout
    };
  }, [token, user]);

  console.log('[AuthContext] AuthProvider rendering.');
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  // console.log('[AuthContext] useAuth() hook called.');
  const context = useContext(AuthContext);
  if (context === undefined || context === null) { 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 