import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const conversationId = searchParams.get('conversation_id');

  useEffect(() => {
    const timer = setTimeout(() => {
      // Show success message
      toast.success(t('payment.success.message'));
      
      // Redirect based on whether we have a conversation_id
      if (conversationId) {
        navigate(`/mystery/${conversationId}?purchase=success`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }, 1500); // Short delay to show loading state

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
