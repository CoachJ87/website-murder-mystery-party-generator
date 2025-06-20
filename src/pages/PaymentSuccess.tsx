import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Debug URL parameters
  useEffect(() => {
    console.log('PaymentSuccess - Current URL:', window.location.href);
    console.log('PaymentSuccess - Location search:', location.search);
    console.log('PaymentSuccess - All search params:', Object.fromEntries(searchParams.entries()));
  }, [location.search, searchParams]);
  
  // Get and log conversation_id
  const conversationId = useMemo(() => {
    const id = searchParams.get('conversation_id');
    console.log('PaymentSuccess - Extracted conversation_id:', id);
    return id;
  }, [searchParams]);

  useEffect(() => {
    // Show success message immediately
    toast.success(t('payment.success.message'));
    
    const timer = setTimeout(() => {
      // Debug before navigation
      console.log('PaymentSuccess - Navigating with conversation_id:', conversationId);
      
      // Redirect based on whether we have a conversation_id
      if (conversationId) {
        const targetUrl = `/mystery/${conversationId}?purchase=success`;
        console.log('PaymentSuccess - Navigating to:', targetUrl);
        navigate(targetUrl, { replace: true });
      } else {
        console.log('PaymentSuccess - No conversation_id, navigating to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }, 1500); // 1.5 second delay to show the toast

    return () => clearTimeout(timer);
  }, [conversationId, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
        <h1 className="text-2xl font-bold">{t('payment.success.verifying')}</h1>
        <p className="text-muted-foreground">
          {t('payment.success.redirecting')}
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
