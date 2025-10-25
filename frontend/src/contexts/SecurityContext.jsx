// Security Context for COAM SaaS Frontend
// Handles enhanced authentication, MFA, and security features

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Security Context
const SecurityContext = createContext();

// Security action types
const SECURITY_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGIN_MFA_REQUIRED: 'LOGIN_MFA_REQUIRED',
  LOGOUT: 'LOGOUT',
  MFA_SETUP_START: 'MFA_SETUP_START',
  MFA_SETUP_SUCCESS: 'MFA_SETUP_SUCCESS',
  MFA_SETUP_FAILURE: 'MFA_SETUP_FAILURE',
  PASSWORD_CHANGE_START: 'PASSWORD_CHANGE_START',
  PASSWORD_CHANGE_SUCCESS: 'PASSWORD_CHANGE_SUCCESS',
  PASSWORD_CHANGE_FAILURE: 'PASSWORD_CHANGE_FAILURE',
  SET_SECURITY_METRICS: 'SET_SECURITY_METRICS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial security state
const initialState = {
  user: null,
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  
  // MFA state
  mfaRequired: false,
  availableMfaMethods: [],
  mfaUserId: null,
  
  // Security features
  mustChangePassword: false,
  securityMetrics: null,
  
  // MFA setup
  mfaSetup: {
    isInProgress: false,
    method: null,
    qrCode: null,
    backupCodes: [],
    secret: null
  }
};

// Security reducer
function securityReducer(state, action) {
  switch (action.type) {
    case SECURITY_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
      
    case SECURITY_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.access_token,
        refreshToken: action.payload.refresh_token,
        mustChangePassword: action.payload.must_change_password || false,
        isLoading: false,
        error: null,
        mfaRequired: false
      };
      
    case SECURITY_ACTIONS.LOGIN_MFA_REQUIRED:
      return {
        ...state,
        mfaRequired: true,
        availableMfaMethods: action.payload.available_methods || [],
        mfaUserId: action.payload.user_id,
        isLoading: false
      };
      
    case SECURITY_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        error: action.payload.error,
        mfaRequired: false
      };
      
    case SECURITY_ACTIONS.LOGOUT:
      return {
        ...initialState
      };
      
    case SECURITY_ACTIONS.MFA_SETUP_START:
      return {
        ...state,
        mfaSetup: {
          ...state.mfaSetup,
          isInProgress: true,
          method: action.payload.method
        },
        error: null
      };
      
    case SECURITY_ACTIONS.MFA_SETUP_SUCCESS:
      return {
        ...state,
        mfaSetup: {
          ...state.mfaSetup,
          isInProgress: false,
          qrCode: action.payload.qr_code,
          backupCodes: action.payload.backup_codes,
          secret: action.payload.secret
        },
        user: {
          ...state.user,
          mfa_enabled: true
        }
      };
      
    case SECURITY_ACTIONS.MFA_SETUP_FAILURE:
      return {
        ...state,
        mfaSetup: {
          ...state.mfaSetup,
          isInProgress: false
        },
        error: action.payload.error
      };
      
    case SECURITY_ACTIONS.PASSWORD_CHANGE_SUCCESS:
      return {
        ...state,
        mustChangePassword: false,
        error: null
      };
      
    case SECURITY_ACTIONS.SET_SECURITY_METRICS:
      return {
        ...state,
        securityMetrics: action.payload
      };
      
    case SECURITY_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case SECURITY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case SECURITY_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
}

// Security Provider Component
export function SecurityProvider({ children }) {
  const [state, dispatch] = useReducer(securityReducer, initialState);

  // API client setup
  const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
  });

  // Add auth token to requests
  api.interceptors.request.use((config) => {
    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
    return config;
  });

  // Handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && state.refreshToken) {
        try {
          await refreshToken();
          // Retry original request
          return api.request(error.config);
        } catch (refreshError) {
          dispatch({ type: SECURITY_ACTIONS.LOGOUT });
        }
      }
      return Promise.reject(error);
    }
  );

  // Load user from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('coam_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.token && authData.user) {
          dispatch({
            type: SECURITY_ACTIONS.LOGIN_SUCCESS,
            payload: authData
          });
        }
      } catch (error) {
        localStorage.removeItem('coam_auth');
      }
    }
  }, []);

  // Save auth state to localStorage
  useEffect(() => {
    if (state.isAuthenticated && state.user && state.token) {
      localStorage.setItem('coam_auth', JSON.stringify({
        user: state.user,
        access_token: state.token,
        refresh_token: state.refreshToken,
        must_change_password: state.mustChangePassword
      }));
    } else {
      localStorage.removeItem('coam_auth');
    }
  }, [state.isAuthenticated, state.user, state.token, state.refreshToken]);

  // Authentication actions
  const login = async (email, password, mfaCode = null, mfaMethod = null) => {
    dispatch({ type: SECURITY_ACTIONS.LOGIN_START });
    
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
        mfa_code: mfaCode,
        mfa_method: mfaMethod
      });

      if (response.data.requires_mfa) {
        dispatch({
          type: SECURITY_ACTIONS.LOGIN_MFA_REQUIRED,
          payload: response.data
        });
        return { requiresMFA: true, data: response.data };
      } else {
        dispatch({
          type: SECURITY_ACTIONS.LOGIN_SUCCESS,
          payload: response.data
        });
        return { success: true, data: response.data };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      dispatch({
        type: SECURITY_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      if (state.token) {
        await api.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: SECURITY_ACTIONS.LOGOUT });
    }
  };

  const register = async (userData) => {
    dispatch({ type: SECURITY_ACTIONS.SET_LOADING, payload: true });
    
    try {
      const response = await api.post('/api/auth/register', userData);
      dispatch({ type: SECURITY_ACTIONS.SET_LOADING, payload: false });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      dispatch({ 
        type: SECURITY_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  const refreshToken = async () => {
    if (!state.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/api/auth/refresh', {
      refresh_token: state.refreshToken
    });

    dispatch({
      type: SECURITY_ACTIONS.LOGIN_SUCCESS,
      payload: response.data
    });

    return response.data;
  };

  // MFA actions
  const setupMFA = async (method, phoneNumber = null, email = null) => {
    dispatch({ 
      type: SECURITY_ACTIONS.MFA_SETUP_START, 
      payload: { method } 
    });

    try {
      const response = await api.post('/api/auth/mfa/setup', {
        method,
        phone_number: phoneNumber,
        email
      });

      dispatch({
        type: SECURITY_ACTIONS.MFA_SETUP_SUCCESS,
        payload: response.data
      });

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'MFA setup failed';
      dispatch({
        type: SECURITY_ACTIONS.MFA_SETUP_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  const sendMFACode = async (method) => {
    try {
      const response = await api.post(`/api/auth/mfa/send-code?method=${method}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to send MFA code';
      return { success: false, error: errorMessage };
    }
  };

  const verifyMFA = async (method, code) => {
    try {
      const response = await api.post('/api/auth/mfa/verify', {
        method,
        code
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'MFA verification failed';
      return { success: false, error: errorMessage };
    }
  };

  // Password management
  const changePassword = async (currentPassword, newPassword) => {
    dispatch({ type: SECURITY_ACTIONS.PASSWORD_CHANGE_START });

    try {
      const response = await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      dispatch({ type: SECURITY_ACTIONS.PASSWORD_CHANGE_SUCCESS });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Password change failed';
      dispatch({
        type: SECURITY_ACTIONS.PASSWORD_CHANGE_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  // Security monitoring
  const getSecurityMetrics = async () => {
    try {
      const response = await api.get('/api/security/metrics');
      dispatch({
        type: SECURITY_ACTIONS.SET_SECURITY_METRICS,
        payload: response.data
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to load security metrics';
      return { success: false, error: errorMessage };
    }
  };

  // Utility functions
  const clearError = () => {
    dispatch({ type: SECURITY_ACTIONS.CLEAR_ERROR });
  };

  const hasRole = (requiredRole) => {
    if (!state.user) return false;
    
    const Hierarchy = {
      'super_admin': 100,
      'tenant_admin': 80,
      'dispatcher': 60,
      'technician': 40,
      'accountant': 40,
      'viewer': 20
    };

    const userLevel = Hierarchy[state.] || 0;
    const requiredLevel = Hierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  const canAccessTenant = (tenantId) => {
    if (!state.user) return false;
    if (state. === 'super_admin') return true;
    return state.user.tenant_id === tenantId;
  };

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    register,
    setupMFA,
    sendMFACode,
    verifyMFA,
    changePassword,
    getSecurityMetrics,
    clearError,
    
    // Utilities
    hasRole,
    canAccessTenant,
    api
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

// Custom hook to use security context
export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

// Higher-order component for route protection
export function withAuth(Component, requiredRole = null) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, hasRole, user } = useSecurity();

    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return <div>You don't have permission to access this page.</div>;
    }

    return <Component {...props} />;
  };
}