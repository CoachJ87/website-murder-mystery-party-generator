import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { MysteryData, Conversation } from "@/interfaces/mystery";
import { useAuth } from "@/context/AuthContext";

const MysteryView = () => {
  const [mystery, setMystery] = useState<Conversation | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching mystery:", error);
        toast.error("Failed to load mystery");
        return;
      }

      setMystery(conversation);
    };

    fetchMystery();
  }, [id]);

  const handleGeneratePackage = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    try {
      const content = await generateCompletePackage(id);
      setPackageContent(content);
    } catch (error: any) {
      console.error("Error generating package:", error);
      toast.error(error.message || "Failed to generate complete package");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!packageContent) {
      toast.error("No content to download");
      return;
    }

    const blob = new Blob([packageContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mystery?.title || "mystery"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!mystery) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{mystery.title}</h1>
            <p className="text-muted-foreground">
              View your murder mystery details and download the complete package.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Mystery Details</CardTitle>
              <CardDescription>
                Here are the details of your murder mystery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mystery.mystery_data ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(mystery.mystery_data, null, 2)}
                </pre>
              ) : (
                <p>No mystery data available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complete Murder Mystery Package</CardTitle>
              <CardDescription>
                Generate and download the complete murder mystery package.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {packageContent ? (
                <div className="space-y-2">
                  <p>
                    Your complete murder mystery package is ready!
                  </p>
                  <Button onClick={handleDownload}>Download Package</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Click the button below to generate the complete murder
                    mystery package.
                  </p>
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={generating}
                  >
                    {generating ? "Generating..." : "Generate Package"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MysteryView;
