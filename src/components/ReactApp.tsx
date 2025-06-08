'use client';

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoadingBoundary from "@/components/LoadingBoundary";

// Import all your existing pages
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CheckEmail from "@/pages/CheckEmail";
import AccountSettings from "@/pages/AccountSettings";
import MysteryCreation from "@/pages/MysteryCreation";
import MysteryChatPage from "@/pages/MysteryChat";
import MysteryPurchase from "@/pages/MysteryPurchase";
import MysteryView from "@/pages/MysteryView";
import Showcase from "@/pages/Showcase";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Support from "@/pages/Support";
import NotFound from "@/pages/NotFound";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";

const queryClient = new QueryClient();

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  return (
    <LoadingBoundary loading={loading}>
      {isAuthenticated ? (
        <>{children}</>
      ) : (
        <Navigate to="/sign-in" replace />
      )}
    </LoadingBoundary>
  );
};

// Router initialization with initial route
const RouterInitializer = ({ initialRoute }: { initialRoute: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (location.pathname === '/' && initialRoute !== '/') {
      navigate(initialRoute, { replace: true });
    }
  }, [initialRoute, navigate, location]);
  
  return null;
};

const ReactApp = ({ initialRoute = '/' }: { initialRoute?: string }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RouterInitializer initialRoute={initialRoute} />
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            
            {/* Payment success and cancel routes */}
            <Route path="/payment-success" element={<Navigate to="/\" replace />} />
            <Route path="/payment-canceled" element={<Navigate to="/\" replace />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/account" 
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mystery/create" 
              element={<MysteryCreation />} 
            />
            <Route 
              path="/mystery/edit/:id" 
              element={
                <ProtectedRoute>
                  <MysteryChatPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mystery/chat/:id" 
              element={
                <ProtectedRoute>
                  <MysteryChatPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mystery/purchase/:id" 
              element={<MysteryPurchase />} 
            />
            <Route path="/mystery/:id" element={<MysteryView />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default ReactApp;