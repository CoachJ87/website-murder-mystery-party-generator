
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CheckEmail from "./pages/CheckEmail";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import MysteryDashboard from "./pages/MysteryDashboard";
import MysteryCreation from "./pages/MysteryCreation";
import MysteryPreview from "./pages/MysteryPreview";
import MysteryPurchase from "./pages/MysteryPurchase";
import MysteryView from "./pages/MysteryView";
import Showcase from "./pages/Showcase";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import React from "react";

const queryClient = new QueryClient();

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/sign-in" replace />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/sign-in" element={<SignIn />} />
    <Route path="/sign-up" element={<SignUp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/check-email" element={<CheckEmail />} />
    <Route path="/showcase" element={<Showcase />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/support" element={<Support />} />
    
    {/* Payment success and cancel routes */}
    <Route path="/payment-success" element={<Navigate to="/dashboard" replace />} />
    <Route path="/payment-canceled" element={<Navigate to="/dashboard" replace />} />
    
    {/* Protected routes */}
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <MysteryDashboard />
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
      element={<MysteryCreation />} 
    />
    <Route 
      path="/mystery/preview/:id" 
      element={<MysteryPreview />} 
    />
    <Route 
      path="/mystery/purchase/:id" 
      element={<MysteryPurchase />} 
    />
    <Route 
      path="/mystery/:id" 
      element={
        <ProtectedRoute>
          <MysteryView />
        </ProtectedRoute>
      } 
    />
    
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
