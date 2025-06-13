
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import SignInPrompt from "@/components/SignInPrompt";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

// Define all possible mystery themes with their corresponding prompts
const MYSTERY_THEMES = [
  { name: "hero.themes.1920sSpeakeasy", prompt: "I want to host a 1920s Speakeasy themed murder mystery set during the prohibition era." },
  { name: "hero.themes.hollywoodMurder", prompt: "Design a murder mystery that takes place on a Hollywood film set in the golden age of cinema." },
  { name: "hero.themes.castleMystery", prompt: "Develop a murder mystery set in a remote medieval castle that's been converted into a luxury hotel." },
  { name: "hero.themes.sciFiMystery", prompt: "Design a murder mystery set aboard a research space station orbiting a newly discovered exoplanet." },
  { name: "hero.themes.artGalleryOpening", prompt: "Create a murder mystery set in a prestigious art gallery during a high-profile exhibition opening." },
  { name: "hero.themes.bakeryCompetition", prompt: "Design a murder mystery centered around a small-town bakery competition." },
  { name: "hero.themes.mountainSkiResort", prompt: "Develop a murder mystery at an isolated mountain ski resort during a blizzard." },
  { name: "hero.themes.luxuryTrainJourney", prompt: "Craft a mystery set on a luxury train journey through the Swiss Alps." },
  { name: "hero.themes.historicUniversity", prompt: "Build a murder mystery set at a historic university with a haunted past." },
  { name: "hero.themes.pokerTournament", prompt: "Create a mystery at a high-stakes poker tournament ." },
  { name: "hero.themes.barbieDreamworld", prompt: "Design a murder mystery in a Barbie-inspired dreamworld where everything is pink and perfect." },
  { name: "hero.themes.dystopianWaterworld", prompt: "Craft a dystopian future mystery where water is the most precious resource." },
  { name: "hero.themes.jungleSteampunk", prompt: "Develop a murder mystery set in the jungle with steampunk technology and vibes." },
  { name: "hero.themes.magicalBakery", prompt: "Create a murder mystery in a magical bakery where enchanted desserts are the specialty." },
  { name: "hero.themes.gamingTournament", prompt: "Design a video game-themed mystery where players at a gaming tournament." },
  { name: "hero.themes.synthwave80s", prompt: "Craft a mystery set in an alternate 1980s where synthwave music controls emotions." },
  { name: "hero.themes.beachResort", prompt: "Develop a murder mystery at a tropical beach resort." },
  { name: "hero.themes.operaHouse", prompt: "Create a mystery set during a premiere at a historic opera house." },
  { name: "hero.themes.wineCountry", prompt: "Design a whodunit at a prestigious vineyard during harvest season." },
  { name: "hero.themes.safariAdventure", prompt: "Craft a murder mystery during an African safari expedition." },
  { name: "hero.themes.fashionShow", prompt: "Build a mystery backstage at a high-profile fashion show." },
  { name: "hero.themes.casinoNight", prompt: "Create a mystery during a charity casino night fundraiser." },
  { name: "hero.themes.fairyTaleKingdom", prompt: "Design a murder mystery in an enchanted fairy tale kingdom." },
  { name: "hero.themes.spaceColony", prompt: "Craft a mystery on humanity's first Mars colony." },
  { name: "hero.themes.superheroAcademy", prompt: "Develop a mystery at a school for young superheroes in training." },
  { name: "hero.themes.underwaterCity", prompt: "Create a murder mystery in a futuristic underwater city." },
  { name: "hero.themes.wildWestSaloon", prompt: "Design a mystery in a frontier town during the gold rush." },
  { name: "hero.themes.vikingFeast", prompt: "Craft a murder mystery during a traditional Viking celebration." },
  { name: "hero.themes.candyKingdom", prompt: "Create a murder mystery in a world where everything is made of sweets and sugar." },
  { name: "hero.themes.dragonsLair", prompt: "Design a mystery in a medieval fantasy world where humans and dragons coexist." },
  { name: "hero.themes.timeTravelersBall", prompt: "Craft a murder mystery at a gathering where attendees come from different time periods." },
  { name: "hero.themes.atlantisRising", prompt: "Develop a mystery in the recently emerged ancient city of Atlantis." },
  { name: "hero.themes.toyBoxAdventure", prompt: "Create a mystery where toys come to life when humans aren't looking." },
  { name: "hero.themes.vampireMasquerade", prompt: "Design a mystery at an exclusive vampire society's annual blood ball." },
  { name: "hero.themes.dimensionHopping", prompt: "Craft a mystery that spans multiple parallel universes." },
  { name: "hero.themes.cyberpunkNightclub", prompt: "Create a murder mystery in a neon-soaked cyberpunk nightclub." },
  { name: "hero.themes.ghostShip", prompt: "Design a mystery aboard a legendary vessel that vanished centuries ago and has mysteriously reappeared." },
  { name: "hero.themes.sentientPlantColony", prompt: "Create a murder mystery in a society of intelligent, mobile plants with a complex social hierarchy." }
];

const Hero = () => {
  // State for holding selected themes and input value
  const [selectedThemes, setSelectedThemes] = useState<typeof MYSTERY_THEMES>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  const handleSubmit = (value: string) => {
    if (!value.trim()) {
      toast.error("Please enter a description for your mystery");
      return;
    }
    
    if (isAuthenticated) {
      setIsCreating(true);
      
      try {
        // Extract theme from user input
        const theme = extractThemeFromPrompt(value);
        
        console.log("Navigating to create page with theme:", theme);
        
        // Navigate to mystery creation with theme as URL parameter
        navigate(`/mystery/create?input=${encodeURIComponent(value)}`);
        
      } catch (error) {
        console.error("Error:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsCreating(false);
      }
    } else {
      setShowSignInPrompt(true);
    }
  };

  return (
    <div className="py-8 sm:py-12 md:py-20 px-2 sm:px-4 md:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-7xl mx-auto text-center">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-primary to-secondary opacity-90 blur-sm"></div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-3 sm:mb-4 tracking-tight leading-tight font-playfair">
          {t('hero.title')}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 sm:mb-5 px-2 font-inter">
          {isAuthenticated 
            ? t('hero.subtitleAuth')
            : t('hero.subtitle')}
        </p>
        
        <div className="max-w-xl mx-auto px-2 sm:px-0">
          <AIInputWithLoading
            placeholder={isAuthenticated 
              ? t('hero.placeholderAuth')
              : t('hero.placeholder')}
            value={inputValue}
            setValue={setInputValue}
            onSubmit={handleSubmit}
            loading={isCreating}
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-5 px-2">
          {selectedThemes.map((theme) => (
            <Button 
              key={theme.name} 
              variant="outline" 
              className="rounded-full px-3 sm:px-4 md:px-6 border-border/50 bg-card/30 backdrop-blur-sm text-xs sm:text-sm h-8 sm:h-9 md:h-10 font-inter"
              onClick={() => handleThemeSelect(theme.prompt)}
            >
              <span className="truncate max-w-[120px] sm:max-w-none">{t(theme.name)}</span>
              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
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
