
import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gallery, User } from "lucide-react";

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
  },
  {
    id: 2,
    title: "Death on the Orient Express",
    description: "A thrilling mystery aboard a luxury train traveling through Europe.",
    author: "John Doe",
    players: "8-10",
    difficulty: "Hard",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "The Poisoned Cocktail",
    description: "A murder mystery set during a glamorous cocktail party in the 1950s.",
    author: "Emma Johnson",
    players: "5-7",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Secrets of the Ancient Temple",
    description: "Archaeological expedition gone wrong with mysterious deaths and ancient curses.",
    author: "Michael Brown",
    players: "7-9",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 5,
    title: "Hollywood Homicide",
    description: "A murder on a movie set with directors, actors, and crew as the main suspects.",
    author: "Sarah Wilson",
    players: "6-8",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 6,
    title: "Casino Royale Mystery",
    description: "High stakes and higher danger at an exclusive casino with a murderer on the loose.",
    author: "David Thompson",
    players: "8-10",
    difficulty: "Hard",
    imageUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=1000&auto=format&fit=crop",
  },
];

const Showcase = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredItems = showcaseItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
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
                    <Button className="w-full">View Mystery</Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <Gallery size={48} className="mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium">No mysteries found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Showcase;
