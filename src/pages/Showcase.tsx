
import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, User, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Mock data for showcase items
const showcaseItems = [
  {
    id: 1,
    title: "Murder at the Mansion",
    description: "A classic whodunit set in a lavish estate with suspects from all walks of life.",
    author: "Jane Smith",
    players: "6-8",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1579025743489-3cc56b0b1ba3?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "Welcome to the annual gala at the prestigious Thornfield Estate. What should have been an evening of elegance and celebration turns deadly when the host, billionaire industrialist Richard Thornfield, is found murdered in his study. With a storm raging outside and the police unable to arrive until morning, it's up to the guests to solve the crime. Each character has their own secrets and motivations, and one of them is a killer. Can you identify the murderer before they strike again?",
    characters: ["The Butler", "The Heiress", "The Business Partner", "The Ex-Wife", "The Chef", "The Celebrity", "The Detective"],
  },
  {
    id: 2,
    title: "Death on the Orient Express",
    description: "A thrilling mystery aboard a luxury train traveling through Europe.",
    author: "John Doe",
    players: "8-10",
    difficulty: "Hard",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "Inspired by Agatha Christie's classic, this mystery unfolds on the famous Orient Express. A wealthy businessman is found stabbed in his compartment, and with the train stuck in a snowdrift, the killer must be among the passengers. Each character has a connection to a past tragedy, and revenge is in the air. This complex mystery requires careful attention to alibis and motives.",
    characters: ["The Detective", "The Secretary", "The Countess", "The Doctor", "The Colonel", "The Governess", "The Valet", "The Princess"],
  },
  {
    id: 3,
    title: "The Poisoned Cocktail",
    description: "A murder mystery set during a glamorous cocktail party in the 1950s.",
    author: "Emma Johnson",
    players: "5-7",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "It's 1956 in Hollywood, and famous director Maxwell Reed is hosting a cocktail party to celebrate his latest film. When he drops dead after drinking his signature martini, everyone at the party becomes a suspect. Was it his jealous wife? His rival director? The starlet he recently fired? This mystery features glamour, gossip, and deadly secrets.",
    characters: ["The Starlet", "The Producer", "The Director's Wife", "The Rival", "The Bartender"],
  },
  {
    id: 4,
    title: "Secrets of the Ancient Temple",
    description: "Archaeological expedition gone wrong with mysterious deaths and ancient curses.",
    author: "Michael Brown",
    players: "7-9",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "An archaeological team has made the discovery of the century - an untouched temple deep in the jungle. But when the expedition leader is found dead with strange markings on his body, talk of an ancient curse spreads through the camp. Is there something supernatural at work, or is there a very human killer with their own agenda? As more members of the expedition die, time is running out to solve the mystery.",
    characters: ["The Professor", "The Heir Funding the Expedition", "The Local Guide", "The Photographer", "The Graduate Student", "The Rival Archaeologist", "The Journalist"],
  },
  {
    id: 5,
    title: "Hollywood Homicide",
    description: "A murder on a movie set with directors, actors, and crew as the main suspects.",
    author: "Sarah Wilson",
    players: "6-8",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "On the set of a blockbuster action film, the demanding star is found dead in his trailer. With millions of dollars at stake and production halted, the producer is desperate to find the killer quickly and quietly. Every suspect has a motive - from the understudy who wanted the role to the director who couldn't control the star's demands. Behind the glamour of Hollywood lies a web of jealousy, debt, and secrets.",
    characters: ["The Director", "The Producer", "The Understudy", "The Stunt Double", "The Agent", "The Makeup Artist", "The Screenwriter"],
  },
  {
    id: 6,
    title: "Casino Royale Mystery",
    description: "High stakes and higher danger at an exclusive casino with a murderer on the loose.",
    author: "David Thompson",
    players: "8-10",
    difficulty: "Hard",
    imageUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At the exclusive Casino Royale, a high-stakes poker game turns deadly when the casino owner is poisoned during the final hand. Every player at the table had a reason to want him dead - gambling debts, blackmail, revenge. The casino has been locked down until the killer is found, but with millions in chips on the table, tensions are running high.",
    characters: ["The Card Sharp", "The Heiress", "The Former Employee", "The Security Chief", "The Rival Casino Owner", "The Blackmailed Politician", "The Dealer", "The Private Investigator"],
  },
  {
    id: 7,
    title: "Deadly Reunion",
    description: "A high school reunion turns deadly when old rivalries and secrets resurface.",
    author: "Patricia Clark",
    players: "6-9",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "Twenty years after graduation, the class of 2003 returns to Lakeside High for their reunion. When the former prom queen is found dead in the gymnasium, old rivalries and buried secrets come to light. Everyone had a reason to hate her - the classmate she bullied, the boyfriend she cheated on, the teacher whose career she nearly ruined. This mystery explores how the past can come back to haunt you.",
    characters: ["The Former Jock", "The Nerd Turned Tech Billionaire", "The Teacher", "The Former Best Friend", "The Ex-Boyfriend", "The Class President", "The Outsider", "The Yearbook Editor"],
  },
  {
    id: 8,
    title: "Murder on the Menu",
    description: "A renowned chef is poisoned during a cooking competition.",
    author: "James Wilson",
    players: "5-8",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At the finals of the International Chef Championship, celebrity chef Anton Morel falls dead after tasting his own creation. Every finalist had a reason to want him gone - stolen recipes, harsh criticism, personal feuds. This culinary mystery involves food sabotage, kitchen rivalries, and the cutthroat world of fine dining.",
    characters: ["The Sous Chef", "The Food Critic", "The Rival Chef", "The TV Producer", "The Apprentice", "The Restaurant Owner", "The Food Blogger"],
  },
  {
    id: 9,
    title: "Death at Dawn",
    description: "A yoga retreat becomes a crime scene when the guru is found murdered.",
    author: "Nina Patel",
    players: "6-7",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1545389336-cf090694435e?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At an exclusive mountaintop yoga retreat, participants seek peace and enlightenment. But when the famous guru is found dead in the meditation room at dawn, it becomes clear that someone came seeking revenge. Each guest has a connection to the victim - a former lover, a business partner, a rival spiritual leader. This mystery explores the contrast between the serene setting and the darkness within.",
    characters: ["The Business Partner", "The Jealous Assistant", "The Celebrity Client", "The Skeptical Doctor", "The Devoted Follower", "The Rival Guru"],
  },
  {
    id: 10,
    title: "The Art of Murder",
    description: "A gallery opening becomes deadly when the featured artist is killed.",
    author: "Thomas Reed",
    players: "7-10",
    difficulty: "Hard",
    imageUrl: "https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At the prestigious Whitmore Gallery, the opening night of controversial artist Vincent Clay's exhibition ends in tragedy when he's found strangled with a piece of his own artwork. The gallery is full of people who hated him - critics he insulted, artists he plagiarized, lovers he betrayed. This mystery delves into the dark side of the art world, where creativity and jealousy often go hand in hand.",
    characters: ["The Gallery Owner", "The Art Critic", "The Rival Artist", "The Muse", "The Collector", "The Former Mentor", "The Dealer", "The Forger"],
  },
  {
    id: 11,
    title: "A Fatal Prescription",
    description: "A doctor is murdered at a hospital with plenty of suspects.",
    author: "Robert Johnson",
    players: "5-8",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At St. Mary's Hospital, the head of cardiology, Dr. William Mason, is found dead in his office from an overdose of medication. As the chief of staff, he had made many enemies - nurses he harassed, doctors whose careers he sabotaged, patients who suffered from his negligence. This medical mystery involves hospital politics, professional jealousy, and the power of life and death.",
    characters: ["The Nurse", "The Rival Doctor", "The Patient's Family Member", "The Hospital Administrator", "The Pharmacist", "The Medical Student", "The Whistleblower"],
  },
  {
    id: 12,
    title: "Last Call",
    description: "The owner of a popular bar is murdered after hours.",
    author: "Lisa Chen",
    players: "5-7",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=1000&auto=format&fit=crop",
    fullDescription: "At the trendy downtown bar 'Last Call', owner Jack Murphy is found dead after closing time. The only people present were his staff and a few regular customers he invited for a private party. Each has a motive - from the bartender he was about to fire to the investor he was cheating. This mystery has a small suspect pool but complex relationships and hidden connections.",
    characters: ["The Bartender", "The Regular", "The Investor", "The Ex-Partner", "The Chef", "The Entertainer"],
  },
];

const Showcase = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleItems, setVisibleItems] = useState(6);
  const [selectedMystery, setSelectedMystery] = useState<any>(null);
  
  const filteredItems = showcaseItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadMore = () => {
    setVisibleItems(prev => Math.min(prev + 6, filteredItems.length));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 container mx-auto py-12 px-4">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-6 text-center">Mystery Showcase</h1>
          <p className="text-lg text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Explore community-created murder mysteries. Find the perfect story for your next gathering or share your own creations with others.
          </p>

          <div className="relative max-w-md mx-auto mb-12">
            <Input
              type="search"
              placeholder="Search mysteries..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        <Separator className="my-8" />

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.slice(0, visibleItems).map((item) => (
                <Card key={item.id} className="overflow-hidden h-full flex flex-col">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <User size={16} /> {item.author}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{item.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        {item.players} Players
                      </span>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        {item.difficulty} Difficulty
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button 
                          className="w-full"
                          onClick={() => setSelectedMystery(item)}
                        >
                          View Mystery
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                        {selectedMystery && (
                          <>
                            <SheetHeader>
                              <SheetTitle className="text-2xl">{selectedMystery.title}</SheetTitle>
                              <SheetDescription className="flex items-center gap-1 text-sm">
                                <User size={14} /> {selectedMystery.author}
                              </SheetDescription>
                            </SheetHeader>
                            
                            <div className="my-4">
                              <img 
                                src={selectedMystery.imageUrl} 
                                alt={selectedMystery.title} 
                                className="w-full h-48 object-cover rounded-md"
                              />
                            </div>
                            
                            <div className="my-6">
                              <h3 className="text-lg font-medium mb-2">Description</h3>
                              <p>{selectedMystery.fullDescription}</p>
                            </div>
                            
                            <div className="my-6">
                              <h3 className="text-lg font-medium mb-2">Details</h3>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sm font-medium">Players</p>
                                  <p className="text-sm text-muted-foreground">{selectedMystery.players}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Difficulty</p>
                                  <p className="text-sm text-muted-foreground">{selectedMystery.difficulty}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="my-6">
                              <h3 className="text-lg font-medium mb-2">Characters</h3>
                              <ul className="list-disc pl-5">
                                {selectedMystery.characters.map((character: string, index: number) => (
                                  <li key={index} className="text-sm text-muted-foreground">{character}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <SheetFooter>
                              <SheetClose asChild>
                                <Button variant="outline" className="w-full">Close</Button>
                              </SheetClose>
                            </SheetFooter>
                          </>
                        )}
                      </SheetContent>
                    </Sheet>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <ImageIcon size={48} className="mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium">No mysteries found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </div>
          
          {filteredItems.length > visibleItems && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMore} size="lg">
                Load More
              </Button>
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Showcase;
