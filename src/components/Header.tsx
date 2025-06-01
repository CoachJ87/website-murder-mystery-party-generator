
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Header = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [generatingMystery, setGeneratingMystery] = useState<{id: string, title: string} | null>(null);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Check for active generation
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkForGeneratingMystery = async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select("id, title, needs_package_generation, is_paid")
          .eq("user_id", user?.id)
          .eq("needs_package_generation", true)
          .eq("is_paid", true)
          .limit(1)
          .single();

        if (!error && data) {
          setGeneratingMystery({
            id: data.id,
            title: data.title || "Mystery Package"
          });
        } else {
          setGeneratingMystery(null);
        }
      } catch (error) {
        console.error("Error checking for generating mystery:", error);
      }
    };

    // Initial check
    checkForGeneratingMystery();

    // Check every 30 seconds
    const interval = setInterval(checkForGeneratingMystery, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const handleGenerationClick = () => {
    if (generatingMystery) {
      navigate(`/mystery/${generatingMystery.id}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="py-4 px-4 md:px-8 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2 mr-8 no-underline">
            <span className="text-2xl font-bold gradient-text">Murder Mystery Generator</span>
          </Link>

          {/* Desktop Navigation - Now with Showcase hidden */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Showcase link removed */}
          </nav>
        </div>

        {/* Generation Indicator and Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Generation Indicator */}
          {generatingMystery && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerationClick}
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              <span className="text-xs">Mystery Generating</span>
            </Button>
          )}

          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.avatar && (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="font-medium">{user?.name}</span>
              </div>
              <Button variant="outline" onClick={signOut} className="no-underline">
                Sign Out
              </Button>
              <Button asChild className="no-underline">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="outline" className="no-underline">
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="no-underline">
                <Link to="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-foreground p-2"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu - Now with Showcase hidden */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b p-4 flex flex-col space-y-4 z-50">
          {/* Generation Indicator - Mobile */}
          {generatingMystery && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerationClick}
              className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              <span className="text-xs">Mystery Generating - Tap to View</span>
            </Button>
          )}

          {isAuthenticated ? (
            <>
              <div className="flex items-center space-x-2 py-2">
                {user?.avatar && (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="font-medium">{user?.name}</span>
              </div>
              <Button asChild className="w-full no-underline" onClick={toggleMenu}>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" className="w-full no-underline" onClick={() => {
                signOut();
                toggleMenu();
              }}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="w-full no-underline" onClick={toggleMenu}>
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="w-full no-underline" onClick={toggleMenu}>
                <Link to="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
