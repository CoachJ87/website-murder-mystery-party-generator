
import React from 'react';

interface LoadingBoundaryProps {
  loading: boolean;
  children: React.ReactNode;
}

const LoadingBoundary = ({ loading, children }: LoadingBoundaryProps) => {
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-inter">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingBoundary;
