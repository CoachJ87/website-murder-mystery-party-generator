import React, { useEffect } from 'react';
import { initBoltPreview, isBoltPreview } from '@/utils/bolt-preview-helper';

/**
 * A component that ensures Bolt preview works correctly
 * by providing a fallback when needed
 */
const BoltPreviewFallback: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize Bolt preview compatibility
    if (isBoltPreview()) {
      initBoltPreview();
    }
  }, []);

  // In Bolt preview, render a simplified version
  if (isBoltPreview()) {
    return (
      <div className="bolt-preview-content\" style={{ padding: '20px' }}>
        <h1 style={{ 
          fontFamily: 'Playfair Display, serif', 
          fontSize: '28px', 
          marginBottom: '20px',
          color: '#8B1538'
        }}>
          Murder Mystery Party Generator
        </h1>
        
        <div style={{ 
          background: '#F7F3E9', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #E6E6E6',
          marginBottom: '20px'
        }}>
          <h2 style={{ 
            fontFamily: 'Inter, sans-serif', 
            fontSize: '18px', 
            marginBottom: '10px' 
          }}>
            Preview Ready
          </h2>
          <p style={{ 
            fontFamily: 'Inter, sans-serif', 
            fontSize: '14px', 
            lineHeight: '1.5',
            color: '#555'
          }}>
            The Murder Mystery Party Generator is ready to use. This preview shows a simplified version of the application.
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '15px',
          marginBottom: '20px'
        }}>
          {['1920s Speakeasy', 'Hollywood Murder', 'Castle Mystery', 'Sci-Fi Mystery'].map((theme) => (
            <div key={theme} style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #E6E6E6',
              width: 'calc(50% - 10px)',
              boxSizing: 'border-box'
            }}>
              <h3 style={{ 
                fontFamily: 'Playfair Display, serif', 
                fontSize: '16px', 
                marginBottom: '8px',
                color: '#8B1538'
              }}>
                {theme}
              </h3>
              <p style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontSize: '13px', 
                margin: 0,
                color: '#666'
              }}>
                A murder mystery with {theme.toLowerCase()} theme
              </p>
            </div>
          ))}
        </div>
        
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
          color: '#888',
          textAlign: 'center'
        }}>
          Full application available in the deployed version
        </div>
      </div>
    );
  }

  // Normal rendering for non-Bolt environments
  return <>{children}</>;
};

export default BoltPreviewFallback;