import React, { useEffect, useState } from "react";
import "./GlobalWarningRibbon.css";

const DISMISS_KEY = "ai_generator_warning_dismissed";

const GlobalWarningRibbon: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // If user dismissed earlier in this session, keep it hidden
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (dismissed) setVisible(false);

    // Clear dismissal on page refresh so it reappears next load
    const handleBeforeUnload = () => {
      localStorage.removeItem(DISMISS_KEY);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="global-warning-ribbon" role="status" aria-live="polite">
        <div className="global-warning-content">
          <span className="global-warning-text">
            ⚠️ AI Mystery Generator is currently experiencing issues. Please check back later for when service is restored.
          </span>
          <button
            type="button"
            className="global-warning-close"
            aria-label="Dismiss warning"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
      </div>
      {/* Spacer to offset fixed ribbon height so content sits below it */}
      <div className="global-warning-spacer" aria-hidden="true" />
    </>
  );
};

export default GlobalWarningRibbon;
