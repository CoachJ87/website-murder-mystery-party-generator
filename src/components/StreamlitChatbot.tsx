
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const StreamlitChatbot = () => {
  const [loading, setLoading] = useState(true);
  const [iframeHeight, setIframeHeight] = useState("600px");
  const navigate = useNavigate();

  useEffect(() => {
    // Handle iframe load events and resize as needed
    const handleResize = () => {
      // Adjust iframe height based on viewport
      const viewportHeight = window.innerHeight;
      setIframeHeight(`${Math.max(600, viewportHeight * 0.7)}px`);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleGenerateMystery = () => {
    toast.success("Mystery generated successfully!");
    navigate(`/mystery/preview/${new Date().getTime()}`); // Using timestamp as mock ID
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="w-full bg-white rounded-lg overflow-hidden border shadow">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        <iframe
          src="https://murder-mystery-chatbot-ktzf8u5kjbbusakesbyecg.streamlit.app/?embedded=true"
          height={iframeHeight}
          style={{ width: "100%", border: "none" }}
          title="Murder Mystery Chatbot"
          onLoad={() => setLoading(false)}
          allow="camera;microphone"
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          When you're satisfied with your mystery, generate the preview to continue.
        </p>
        <Button onClick={handleGenerateMystery} className="self-end">
          Generate Mystery Preview
        </Button>
      </div>
    </div>
  );
};

export default StreamlitChatbot;
