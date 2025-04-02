import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Download, Printer, Send, FileText, Book, PenTool, Users, Clipboard, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const MysteryView = () => {
  const [loading, setLoading] = useState(true);
  const [mystery, setMystery] = useState<any>(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadMystery();
  }, [id]);

  const loadMystery = async () => {
    try {
      setLoading(true);
      
      // In a real app, fetch from Supabase
      // const { data, error } = await supabase
      //   .from('mysteries')
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setMystery({
        id,
        title: "Murder at the Speakeasy",
        theme: "1920s Speakeasy",
        setting: "A hidden speakeasy in Chicago during the prohibition era",
        victim: "The wealthy club owner who has many powerful enemies",
        characters: [
          { name: "Jack 'The Dealer' Thompson", role: "Club Owner (Victim)", description: "A charismatic but ruthless businessman with many enemies" },
          { name: "Vivian Rose", role: "Lounge Singer", description: "A talented but ambitious singer with her eye on bigger stages" },
          { name: "Officer Murphy", role: "Corrupt Cop", description: "Takes bribes to look the other way, but demands more than his fair share" },
          { name: "Gloria Thompson", role: "Jack's Wife", description: "Publicly devoted, but privately resentful of Jack's affairs" },
          { name: "Frankie 'The Knife' Lorenzo", role: "Local Gangster", description: "Wants to take over the speakeasy for his own operations" },
          { name: "Dr. Harold Greene", role: "Regular Patron", description: "Respectable doctor with a gambling addiction and mounting debts" }
        ],
        status: "purchased"
      });
    } catch (error) {
      console.error("Error loading mystery:", error);
      toast.error("Failed to load mystery materials");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (section: string) => {
    toast.success(`Downloading ${section} materials...`);
    // In a real app, this would generate and download the PDFs
  };

  const handlePrint = () => {
    toast.success("Preparing print version...");
    // In a real app, this would open the print dialog
  };

  const handleSendToGuests = () => {
    toast.success("Opening email dialog...");
    // In a real app, this would open an email sharing dialog
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
              <h1 className="text-3xl font-bold mb-2">{mystery?.title}</h1>
              <p className="text-muted-foreground">
                Complete mystery package - {mystery?.theme}
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
          
          <Tabs defaultValue="host-guide">
            <TabsList className="mb-8 grid grid-cols-2 md:grid-cols-5 lg:w-auto">
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
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Timeline</span>
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
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Introduction</h3>
                    <p>Welcome to "Murder at the Speakeasy"! This guide will walk you through everything you need to know to host a successful murder mystery party set in 1920s Chicago during the prohibition era.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Before the Party</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Send invitations to your guests at least 2-3 weeks before the event</li>
                      <li>Assign characters to your guests based on their personalities</li>
                      <li>Encourage guests to dress in 1920s attire (suggestions in the Materials section)</li>
                      <li>Print all character sheets, clues, and materials</li>
                      <li>Set up your venue with appropriate decorations (suggestions in the Setup section)</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">During the Party</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Welcome guests and hand out character sheets and name tags</li>
                      <li>Read the introduction to set the scene</li>
                      <li>Announce the discovery of Jack Thompson's body</li>
                      <li>Allow characters to mingle and investigate</li>
                      <li>Distribute clue cards at appropriate times (see Timeline)</li>
                      <li>Guide the accusation phase where characters reveal their suspicions</li>
                      <li>Read the solution reveal script</li>
                    </ol>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={() => handleDownload("host-guide")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Host Guide PDF
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mystery?.characters.map((character: any) => (
                      <div key={character.name} className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold">{character.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{character.role}</p>
                        <p>{character.description}</p>
                      </div>
                    ))}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: "Character Name Tags", icon: <FileText className="h-5 w-5" />, description: "Printable badges for each character" },
                      { name: "Evidence Cards", icon: <FileText className="h-5 w-5" />, description: "Key clues to distribute during the game" },
                      { name: "Invitations", icon: <FileText className="h-5 w-5" />, description: "Customizable party invites" },
                      { name: "Speakeasy Menu", icon: <FileText className="h-5 w-5" />, description: "Authentic 1920s cocktail and food ideas" },
                      { name: "Accusation Sheets", icon: <FileText className="h-5 w-5" />, description: "For guests to write their theories" },
                      { name: "Decoration Ideas", icon: <FileText className="h-5 w-5" />, description: "Tips for setting the scene" }
                    ].map((material) => (
                      <div key={material.name} className="border rounded-lg p-4 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          {material.icon}
                        </div>
                        <h3 className="font-medium mb-1">{material.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{material.description}</p>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(material.name)}>
                          Download
                        </Button>
                      </div>
                    ))}
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
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Venue Decoration</h3>
                    <p className="mb-4">Transform your space into a 1920s speakeasy with these suggestions:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Dim lighting with table lamps or string lights</li>
                      <li>Jazz music playing in the background</li>
                      <li>Vintage posters and black and gold decorations</li>
                      <li>Password sign on the entry door</li>
                      <li>Bar area with "bootleg" drinks</li>
                      <li>Playing cards and fake money on tables</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Costume Ideas</h3>
                    <p className="mb-4">Encourage guests to dress in 1920s attire:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium">For women:</h4>
                        <ul className="list-disc pl-5">
                          <li>Flapper dresses with fringe</li>
                          <li>Long beaded necklaces</li>
                          <li>Feather headbands</li>
                          <li>Long gloves</li>
                          <li>Mary Jane shoes</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">For men:</h4>
                        <ul className="list-disc pl-5">
                          <li>Suits with vests</li>
                          <li>Fedora or newsboy caps</li>
                          <li>Suspenders</li>
                          <li>Bow ties</li>
                          <li>Wingtip shoes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Food & Drink</h3>
                    <p className="mb-4">Authentic 1920s refreshments:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Deviled eggs</li>
                      <li>Cheese and crackers</li>
                      <li>Oysters Rockefeller</li>
                      <li>Finger sandwiches</li>
                      <li>Classic cocktails (or mocktails): Gin Rickey, Sidecar, Mint Julep</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>Event Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="absolute top-0 bottom-0 left-7 border-l-2 border-dashed border-muted-foreground"></div>
                      
                      {[
                        { time: "7:00 PM", title: "Guest Arrival", description: "Welcome guests, serve drinks, and distribute character sheets" },
                        { time: "7:30 PM", title: "Introduction", description: "Read the introduction script and set the scene" },
                        { time: "7:45 PM", title: "Murder Announcement", description: "Announce that Jack Thompson has been found dead" },
                        { time: "8:00 PM", title: "First Round of Clues", description: "Distribute the first set of clue cards" },
                        { time: "8:30 PM", title: "Investigation Period", description: "Characters mingle and investigate" },
                        { time: "9:00 PM", title: "Second Round of Clues", description: "Distribute the second set of clue cards" },
                        { time: "9:30 PM", title: "Final Investigation", description: "Last chance for characters to gather information" },
                        { time: "10:00 PM", title: "Accusation Phase", description: "Each character presents their theory" },
                        { time: "10:30 PM", title: "Solution Reveal", description: "Read the solution script and reveal the murderer" }
                      ].map((event, index) => (
                        <div key={index} className="ml-14 mb-10 relative">
                          <div className="absolute -left-14 mt-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-medium mb-1">{event.time} - {event.title}</h3>
                          <p className="text-muted-foreground">{event.description}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={() => handleDownload("timeline")}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Timeline PDF
                      </Button>
                    </div>
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
      
      <Footer />
    </div>
  );
};

export default MysteryView;
