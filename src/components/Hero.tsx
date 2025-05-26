
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import SignInPrompt from "@/components/SignInPrompt";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Define all possible mystery themes with their corresponding prompts
const MYSTERY_THEMES = [
  { name: "1920s Speakeasy", prompt: "I want to host a 1920s Speakeasy themed murder mystery set during the prohibition era." },
  { name: "Hollywood Murder", prompt: "Design a murder mystery that takes place on a Hollywood film set in the golden age of cinema." },
  { name: "Castle Mystery", prompt: "Develop a murder mystery set in a remote medieval castle that's been converted into a luxury hotel." },
  { name: "Sci-Fi Mystery", prompt: "Design a murder mystery set aboard a research space station orbiting a newly discovered exoplanet." },
  { name: "Art Gallery Opening", prompt: "Create a murder mystery set in a prestigious art gallery during a high-profile exhibition opening." },
  { name: "Bakery Competition", prompt: "Design a murder mystery centered around a small-town bakery competition." },
  { name: "Mountain Ski Resort", prompt: "Develop a murder mystery at an isolated mountain ski resort during a blizzard." },
  { name: "Luxury Train Journey", prompt: "Craft a mystery set on a luxury train journey through the Swiss Alps." },
  { name: "Historic University", prompt: "Build a murder mystery set at a historic university with a haunted past." },
  { name: "Poker Tournament", prompt: "Create a mystery at a high-stakes poker tournament ." },
  { name: "Barbie Dreamworld", prompt: "Design a murder mystery in a Barbie-inspired dreamworld where everything is pink and perfect." },
  { name: "Dystopian Waterworld", prompt: "Craft a dystopian future mystery where water is the most precious resource." },
  { name: "Jungle Steampunk", prompt: "Develop a murder mystery set in the jungle with steampunk technology and vibes." },
  { name: "Magical Bakery", prompt: "Create a murder mystery in a magical bakery where enchanted desserts are the specialty." },
  { name: "Gaming Tournament", prompt: "Design a video game-themed mystery where players at a gaming tournament." },
  { name: "Synthwave 80s", prompt: "Craft a mystery set in an alternate 1980s where synthwave music controls emotions." },
  { name: "Beach Resort", prompt: "Develop a murder mystery at a tropical beach resort." },
  { name: "Opera House", prompt: "Create a mystery set during a premiere at a historic opera house." },
  { name: "Wine Country", prompt: "Design a whodunit at a prestigious vineyard during harvest season." },
  { name: "Safari Adventure", prompt: "Craft a murder mystery during an African safari expedition." },
  { name: "Fashion Show", prompt: "Build a mystery backstage at a high-profile fashion show." },
  { name: "Casino Night", prompt: "Create a mystery during a charity casino night fundraiser." },
  { name: "Fairy Tale Kingdom", prompt: "Design a murder mystery in an enchanted fairy tale kingdom." },
  { name: "Space Colony", prompt: "Craft a mystery on humanity's first Mars colony." },
  { name: "Superhero Academy", prompt: "Develop a mystery at a school for young superheroes in training." },
  { name: "Underwater City", prompt: "Create a murder mystery in a futuristic underwater city." },
  { name: "Wild West Saloon", prompt: "Design a mystery in a frontier town during the gold rush." },
  { name: "Viking Feast", prompt: "Craft a murder mystery during a traditional Viking celebration." },
  { name: "Candy Kingdom", prompt: "Create a murder mystery in a world where everything is made of sweets and sugar." },
  { name: "Dragon's Lair", prompt: "Design a mystery in a medieval fantasy world where humans and dragons coexist." },
  { name: "Time Travelers' Ball", prompt: "Craft a murder mystery at a gathering where attendees come from different time periods." },
  { name: "Atlantis Rising", prompt: "Develop a mystery in the recently emerged ancient city of Atlantis." },
  { name: "Toy Box Adventure", prompt: "Create a mystery where toys come to life when humans aren't looking." },
  { name: "Vampire Masquerade", prompt: "Design a mystery at an exclusive vampire society's annual blood ball." },
  { name: "Dimension Hopping", prompt: "Craft a mystery that spans multiple parallel universes." },
  { name: "Cyberpunk Nightclub", prompt: "Create a murder mystery in a neon-soaked cyberpunk nightclub." },
  { name: "Ghost Ship", prompt: "Design a mystery aboard a legendary vessel that vanished centuries ago and has mysteriously reappeared." },
  { name: "Sentient Plant Colony", prompt: "Create a murder mystery in a society of intelligent, mobile plants with a complex social hierarchy." }
];

const Hero = () => {
  // State for holding selected themes and input value
  const [selectedThemes, setSelectedThemes] = useState<typeof MYSTERY_THEMES>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Function to randomly select themes
  const getRandomThemes = () => {
    const shuffled = [...MYSTERY_THEMES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  };

  // Initialize selected themes on component mount
  useEffect(() => {
    setSelectedThemes(getRandomThemes());
  }, []);

  // Function to handle button click and set input value
  const handleThemeSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  // Extract theme from prompt
  const extractThemeFromPrompt = (prompt: string) => {
    // Check if the prompt directly mentions a theme
    const themeMatch = prompt.match(/theme[d]?\s+(is|of|as|for|about|like)?\s+([a-zA-Z0-9\s'"-]+)/i);
    if (themeMatch && themeMatch[2]) {
      return themeMatch[2].trim();
    }
    
    // Check for direct mentions of settings
    const settings = [
      "speakeasy", "hollywood", "castle", "space", "gallery", "bakery", "resort", 
      "train", "university", "tournament", "dreamworld", "waterworld", "jungle", 
      "magical", "gaming", "80s", "beach", "opera", "vineyard", "safari", "fashion", 
      "casino", "fairy tale", "colony", "superhero", "underwater", "wild west", 
      "viking", "candy", "dragon", "time travel", "atlantis", "toys", "vampire", 
      "dimension", "cyberpunk", "ghost ship", "plant"
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    for (const setting of settings) {
      if (lowerPrompt.includes(setting)) {
        return setting.charAt(0).toUpperCase() + setting.slice(1);
      }
    }
    
    // Default to a generic theme if none detected
    return "Murder Mystery";
  };

  const createSystemInstruction = (prompt: string, theme: string) => {
    let systemMsg = "This is a murder mystery creation conversation. ";
    systemMsg += `The user wants to create a murder mystery with theme: ${theme}. `;
    systemMsg += "Please proceed with creating a murder mystery based on this theme. ";
    systemMsg += "IMPORTANT: Answer only ONE question at a time. Do not combine multiple responses. ";
    systemMsg += "Wait for the user to respond before continuing to the next step. ";
    
    // Important change: Include the full output format guidance
    systemMsg += `\n\nYou MUST follow this exact output format for ALL your responses:

## OUTPUT FORMAT
Present your mystery preview in an engaging, dramatic format that will excite the user. Include:

# "[CREATIVE TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

[After presenting the mystery concept, ask if the concept works for them and explain that they can continue to make edits and that once they are done they can press the 'Generate Mystery' button where they can create a complete game package with detailed character guides, host instructions, and game materials if they choose to purchase.]`;

    return systemMsg;
  };

  const createNewConversation = async (prompt: string) => {
    if (!user?.id) return;
    
    setIsCreating(true);
    
    try {
      // Extract theme from prompt
      const theme = extractThemeFromPrompt(prompt);
      
      // Create system instruction with explicit instruction to answer one question at a time
      const systemInstruction = createSystemInstruction(prompt, theme);
      
      // Create mystery data
      const mysteryData = {
        theme: theme,
        prompt: prompt,
      };
      
      console.log("Creating new conversation with theme:", theme);
      
      // Create a new conversation in the database
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: `${theme} Mystery`,
          mystery_data: mysteryData,
          system_instruction: systemInstruction
        })
        .select()
        .single();

      if (conversationError) {
        toast.error("Failed to create new conversation");
        console.error(conversationError);
        return;
      }

      if (!conversation?.id) {
        toast.error("Failed to get conversation ID");
        return;
      }
      
      // Add the initial message to the conversation
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          content: prompt,
          role: "user"
        });

      if (messageError) {
        toast.error("Failed to create initial message");
        console.error(messageError);
        return;
      }

      // Navigate directly to the mystery creation page with the conversation ID
      navigate(`/mystery/edit/${conversation.id}`);
      
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = (value: string) => {
    if (!value.trim()) {
      toast.error("Please enter a description for your mystery");
      return;
    }
    
    if (isAuthenticated) {
      createNewConversation(value);
    } else {
      setShowSignInPrompt(true);
    }
  };

  return (
    <div className="py-12 md:py-20 px-4 bg-background">
      <div className="container mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-secondary opacity-90 blur-sm"></div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
          Host a Killer Party Tonight.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-5">
          {isAuthenticated 
            ? "Tell us what you'd like to create and we'll make it happen."
            : "Generate custom murder mysteries with characters, clues, and everything you need."}
        </p>
        
        <div className="max-w-xl mx-auto">
          <AIInputWithLoading
            placeholder={isAuthenticated 
              ? "What kind of murder mystery would you like to create today?" 
              : "What kind of murder mystery would you like to host?"}
            value={inputValue}
            setValue={setInputValue}
            onSubmit={handleSubmit}
            loading={isCreating}
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-5">
          {selectedThemes.map((theme) => (
            <Button 
              key={theme.name} 
              variant="outline" 
              className="rounded-full px-6 border-border/50 bg-card/30 backdrop-blur-sm"
              onClick={() => handleThemeSelect(theme.prompt)}
            >
              {theme.name}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ))}
        </div>

        <SignInPrompt 
          isOpen={showSignInPrompt} 
          onClose={() => setShowSignInPrompt(false)} 
        />
      </div>
    </div>
  );
};

export default Hero;
