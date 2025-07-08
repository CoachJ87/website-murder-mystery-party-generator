
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import LoadingBoundary from "@/components/LoadingBoundary";
import { useEffect } from "react";
import { initGA, trackPageView } from "@/lib/analytics";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CheckEmail from "./pages/CheckEmail";
import AccountSettings from "./pages/AccountSettings";
import MysteryCreation from "./pages/MysteryCreation";
import MysteryChatPage from "./pages/MysteryChat";
import MysteryPurchase from "./pages/MysteryPurchase";
import MysteryView from "./pages/MysteryView";
import Showcase from "./pages/Showcase";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import CharacterAccess from "./pages/CharacterAccess";
import PaymentSuccess from "./pages/PaymentSuccess";
import React from "react";

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

// Track route changes
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on first load
    initGA();
  }, []);

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

// Main App component with simplified structure
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteTracker />
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

const AppRoutes = () => {
  const { loading, isAuthenticated } = useAuth();
  
  return (
    <LoadingBoundary loading={loading}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/contact" element={<Navigate to="/support" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        
        {/* Character access route (public) */}
        <Route path="/character/:token" element={<CharacterAccess />} />
        
        {/* Payment success and cancel routes */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-canceled" element={<Navigate to="/" replace />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Index />
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
    </LoadingBoundary>
  );
};

export default App;
