// src/pages/MysteryView.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Download, Printer, Send, FileText, Book, PenTool, Users, Clipboard, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import SendToGuestsDialog from "@/components/SendToGuestsDialog";
import { generateCompletePackage } from "@/services/mysteryPackageService";

// Define interface for mystery data to prevent excessive type recursion
interface MysteryData {
  id: string;
  title: string;
  theme?: string;
  characters?: any[];
  has_purchased?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  free_prompts_used?: number;
  [key: string]: any; // Allow additional properties
}

const MysteryView = () => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mystery, setMystery] = useState<MysteryData | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("host-guide");
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && id) {
      loadMystery();
    }
  }, [id, user]);

  const loadMystery = async () => {
    try {
      setLoading(true);
      
      // Fetch mystery from Supabase
      const { data: mysteryData, error: mysteryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
        
      if (mysteryError || !mysteryData) {
        console.error("Error loading mystery:", mysteryError);
        toast.error("Could not load mystery details");
        navigate("/dashboard");
        return;
      }
      
      // Ensure the mysteryData has a title field, even if it's just a default value
      const processedData: MysteryData = {
        ...mysteryData,
        title: mysteryData.title || "Untitled Mystery"
      };
      
      setMystery(processedData);
      
      // Load package content if it exists
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("mystery_id", id)
        .eq("prompt_version", "paid")
        .eq("is_completed", true)
        .maybeSingle();
        
      if (convError && convError.code !== 'PGRST116') {
        console.error("Error loading package:", convError);
      }
      
      let foundPackage = false;
      
      if (convData && convData.messages && convData.messages.length > 0) {
        // Find AI message with package content
        const packageMessage = convData.messages.find(msg => msg.is_ai);
        if (packageMessage) {
          setPackageContent(packageMessage.content);
          foundPackage = true;
        }
      }
      
      // If no package found, we may need to generate it
      if (!foundPackage) {
        await handleGeneratePackage();
      }
    } catch (error) {
      console.error("Error loading mystery:", error);
      toast.error("Failed to load mystery materials");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePackage = async () => {
    if (!id) return;
    
    try {
      setGenerating(true);
      const content = await generateCompletePackage(id);
      setPackageContent(content);
      toast.success("Murder mystery package generated successfully!");
    } catch (error) {
      console.error("Error generating package:", error);
      toast.error("Failed to generate mystery package. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (section: string) => {
    if (!packageContent) {
      toast.error("Package content not available yet");
      return;
    }
    
    // Create a blob and download link for the entire content
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mystery?.title.replace(/\s+/g, '_')}_${section}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloading ${section} materials...`);
  };

  const handlePrint = () => {
    if (!packageContent) {
      toast.error("Package content not available yet");
      return;
    }
    
    // Create a printable version in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${mystery?.title} - Murder Mystery Package</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              h1, h2, h3 { margin-top: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${mystery?.title}</h1>
            <pre>${packageContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("Could not open print window. Check your popup blocker.");
    }
  };

  const handleSendToGuests = () => {
    setSendDialogOpen(true);
  };

  const parseContent = () => {
    if (!packageContent) return {};
    
    // More robust section parsing with fallbacks
    let hostGuide = "Host guide content not found";
    let characters = "Character guide content not found";
    let materials = "Materials content not found";
    let setup = "Setup instructions not found";
    
    // Try to extract host guide
    if (packageContent.includes('HOST GUIDE')) {
      const hostGuideStart = packageContent.indexOf('HOST GUIDE');
      const hostGuideEnd = packageContent.indexOf('CHARACTER', hostGuideStart);
      if (hostGuideEnd > hostGuideStart) {
        hostGuide = packageContent.substring(hostGuideStart, hostGuideEnd).trim();
      }
    } else if (packageContent.includes('Host Guide')) {
      const hostGuideStart = packageContent.indexOf('Host Guide');
      const hostGuideEnd = packageContent.indexOf('Character', hostGuideStart);
      if (hostGuideEnd > hostGuideStart) {
        hostGuide = packageContent.substring(hostGuideStart, hostGuideEnd).trim();
      }
    }
    
    // Try to extract character profiles
    if (packageContent.includes('CHARACTER GUIDE') || packageContent.includes('CHARACTER PROFILES')) {
      const charactersStart = packageContent.includes('CHARACTER GUIDE') 
        ? packageContent.indexOf('CHARACTER GUIDE')
        : packageContent.indexOf('CHARACTER PROFILES');
      const charactersEnd = packageContent.includes('EVIDENCE')
        ? packageContent.indexOf('EVIDENCE', charactersStart)
        : packageContent.includes('MATERIALS')
          ? packageContent.indexOf('MATERIALS', charactersStart)
          : packageContent.indexOf('SETUP', charactersStart);
      
      if (charactersEnd > charactersStart) {
        characters = packageContent.substring(charactersStart, charactersEnd).trim();
      }
    } else if (packageContent.includes('Character') && packageContent.toLowerCase().includes('profile')) {
      const charactersStart = packageContent.indexOf('Character');
      const charactersEnd = packageContent.indexOf('Evidence', charactersStart) || 
                            packageContent.indexOf('Material', charactersStart) ||
                            packageContent.indexOf('Setup', charactersStart);
      
      if (charactersEnd > charactersStart) {
        characters = packageContent.substring(charactersStart, charactersEnd).trim();
      }
    }
    
    // Try to extract materials
    if (packageContent.includes('MATERIALS') || packageContent.includes('EVIDENCE')) {
      const materialsStart = packageContent.includes('MATERIALS') 
        ? packageContent.indexOf('MATERIALS')
        : packageContent.indexOf('EVIDENCE');
      const materialsEnd = packageContent.indexOf('SETUP', materialsStart);
      
      if (materialsEnd > materialsStart) {
        materials = packageContent.substring(materialsStart, materialsEnd).trim();
      }
    } else if (packageContent.includes('Materials') || packageContent.includes('Evidence')) {
      const materialsStart = packageContent.includes('Materials') 
        ? packageContent.indexOf('Materials')
        : packageContent.indexOf('Evidence');
      const materialsEnd = packageContent.indexOf('Setup', materialsStart);
      
      if (materialsEnd > materialsStart) {
        materials = packageContent.substring(materialsStart, materialsEnd).trim();
      }
    }
    
    // Try to extract setup instructions
    if (packageContent.includes('SETUP INSTRUCTIONS')) {
      const setupStart = packageContent.indexOf('SETUP INSTRUCTIONS');
      setup = packageContent.substring(setupStart).trim();
    } else if (packageContent.includes('Setup Instructions') || packageContent.includes('SETUP')) {
      const setupStart = packageContent.includes('Setup Instructions')
        ? packageContent.indexOf('Setup Instructions')
        : packageContent.indexOf('SETUP');
      setup = packageContent.substring(setupStart).trim();
    }
    
    return { hostGuide, characters, materials, setup };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading your mystery package...</p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }
  
  if (generating) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Generating your complete murder mystery package...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a minute or two.</p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }
  
  if (!packageContent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Generate Your Mystery Package</CardTitle>
              <CardDescription>
                Your mystery package needs to be generated before you can view it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Click the button below to generate your complete murder mystery package with:</p>
              <ul className="list-disc pl-5 space-y-1 mb-6">
                <li>Detailed character guides</li>
                <li>Host instructions</li>
                <li>Evidence cards and game materials</li>
                <li>Setup guidance</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
              <Button onClick={handleGeneratePackage}>
                Generate Package
              </Button>
            </CardFooter>
          </Card>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{mystery?.title || "Murder Mystery"}</h1>
              <p className="text-muted-foreground">
                Complete mystery package - {mystery?.theme || "Mystery Theme"}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleDownload("all")} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Download All</span>
              </Button>
              <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </Button>
              <Button onClick={handleSendToGuests} className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send to Guests</span>
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="host-guide" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:w-auto">
              <TabsTrigger value="host-guide" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                <span>Host Guide</span>
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Characters</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                <span>Materials</span>
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                <span>Setup</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="host-guide">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    <span>Host Guide</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-[600px] p-4 bg-muted/30 rounded-md">
                      {sections.hostGuide}
                    </pre>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={() => handleDownload("host-guide")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Host Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="characters">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>Character Profiles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-[600px] p-4 bg-muted/30 rounded-md">
                      {sections.characters}
                    </pre>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={() => handleDownload("characters")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Character Sheets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    <span>Printable Materials</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-[600px] p-4 bg-muted/30 rounded-md">
                      {sections.materials}
                    </pre>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={() => handleDownload("materials")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="setup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="h-5 w-5" />
                    <span>Setup Instructions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-[600px] p-4 bg-muted/30 rounded-md">
                      {sections.setup}
                    </pre>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={() => handleDownload("setup")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Setup Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={() => handleDownload("all")}>
              Download All Materials
            </Button>
          </div>
        </div>
      </main>
      
      {/* Send to Guests Dialog */}
      <SendToGuestsDialog 
        open={sendDialogOpen} 
        onOpenChange={setSendDialogOpen}
        characters={mystery?.characters || []}
      />
      
      <Footer />
    </div>
  );
};

export default MysteryView;
