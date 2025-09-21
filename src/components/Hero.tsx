
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import SignInPrompt from "@/components/SignInPrompt";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();

  // Define all possible mystery themes with their corresponding prompts
  const MYSTERY_THEMES = useMemo(() => [
    { name: "hero.themes.1920sSpeakeasy", prompt: t("hero.prompts.1920sSpeakeasy") },
    { name: "hero.themes.hollywoodMurder", prompt: t("hero.prompts.hollywoodMurder") },
    { name: "hero.themes.castleMystery", prompt: t("hero.prompts.castleMystery") },
    { name: "hero.themes.sciFiMystery", prompt: t("hero.prompts.sciFiMystery") },
    { name: "hero.themes.artGalleryOpening", prompt: t("hero.prompts.artGalleryOpening") },
    { name: "hero.themes.bakeryCompetition", prompt: t("hero.prompts.bakeryCompetition") },
    { name: "hero.themes.mountainSkiResort", prompt: t("hero.prompts.mountainSkiResort") },
    { name: "hero.themes.luxuryTrainJourney", prompt: t("hero.prompts.luxuryTrainJourney") },
    { name: "hero.themes.historicUniversity", prompt: t("hero.prompts.historicUniversity") },
    { name: "hero.themes.pokerTournament", prompt: t("hero.prompts.pokerTournament") },
    { name: "hero.themes.barbieDreamworld", prompt: t("hero.prompts.barbieDreamworld") },
    { name: "hero.themes.dystopianWaterworld", prompt: t("hero.prompts.dystopianWaterworld") },
    { name: "hero.themes.jungleSteampunk", prompt: t("hero.prompts.jungleSteampunk") },
    { name: "hero.themes.magicalBakery", prompt: t("hero.prompts.magicalBakery") },
    { name: "hero.themes.gamingTournament", prompt: t("hero.prompts.gamingTournament") },
    { name: "hero.themes.synthwave80s", prompt: t("hero.prompts.synthwave80s") },
    { name: "hero.themes.beachResort", prompt: t("hero.prompts.beachResort") },
    { name: "hero.themes.operaHouse", prompt: t("hero.prompts.operaHouse") },
    { name: "hero.themes.wineCountry", prompt: t("hero.prompts.wineCountry") },
    { name: "hero.themes.safariAdventure", prompt: t("hero.prompts.safariAdventure") },
    { name: "hero.themes.fashionShow", prompt: t("hero.prompts.fashionShow") },
    { name: "hero.themes.casinoNight", prompt: t("hero.prompts.casinoNight") },
    { name: "hero.themes.fairyTaleKingdom", prompt: t("hero.prompts.fairyTaleKingdom") },
    { name: "hero.themes.spaceColony", prompt: t("hero.prompts.spaceColony") },
    { name: "hero.themes.superheroAcademy", prompt: t("hero.prompts.superheroAcademy") },
    { name: "hero.themes.underwaterCity", prompt: t("hero.prompts.underwaterCity") },
    { name: "hero.themes.wildWestSaloon", prompt: t("hero.prompts.wildWestSaloon") },
    { name: "hero.themes.vikingFeast", prompt: t("hero.prompts.vikingFeast") },
    { name: "hero.themes.candyKingdom", prompt: t("hero.prompts.candyKingdom") },
    { name: "hero.themes.dragonsLair", prompt: t("hero.prompts.dragonsLair") },
    { name: "hero.themes.timeTravelersBall", prompt: t("hero.prompts.timeTravelersBall") },
    { name: "hero.themes.atlantisRising", prompt: t("hero.prompts.atlantisRising") },
    { name: "hero.themes.toyBoxAdventure", prompt: t("hero.prompts.toyBoxAdventure") },
    { name: "hero.themes.vampireMasquerade", prompt: t("hero.prompts.vampireMasquerade") },
    { name: "hero.themes.dimensionHopping", prompt: t("hero.prompts.dimensionHopping") },
    { name: "hero.themes.cyberpunkNightclub", prompt: t("hero.prompts.cyberpunkNightclub") },
    { name: "hero.themes.ghostShip", prompt: t("hero.prompts.ghostShip") },
    { name: "hero.themes.sentientPlantColony", prompt: t("hero.prompts.sentientPlantColony") }
  ], [t]);

  // State for holding selected themes and input value
  const [selectedThemes, setSelectedThemes] = useState<typeof MYSTERY_THEMES>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Function to randomly select themes
  const getRandomThemes = useCallback(() => {
    const shuffled = [...MYSTERY_THEMES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, [MYSTERY_THEMES]);

  // Initialize selected themes on component mount
  useEffect(() => {
    setSelectedThemes(getRandomThemes());
  }, [getRandomThemes]);

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
        
        // For now, navigate to mystery creation with theme as URL parameter
        // The actual navigation after creation will be handled by the creation component
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
