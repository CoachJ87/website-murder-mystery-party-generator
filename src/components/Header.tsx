
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="py-3 px-3 md:py-4 md:px-8 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2 mr-4 md:mr-8 no-underline">
            <span className="text-lg md:text-2xl font-bold gradient-text font-playfair">
              <span className="hidden sm:inline">Mystery Maker</span>
              <span className="sm:hidden">Mystery Maker</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Navigation items can be added here if needed */}
          </nav>
        </div>

        {/* Auth Buttons and Language Switcher - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <LanguageSwitcher />
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
                <span className="font-medium font-inter">{user?.name}</span>
              </div>
              <Button variant="outline" onClick={signOut} className="no-underline font-inter">
                {t('navigation.signOut')}
              </Button>
              <Button asChild className="no-underline font-inter">
                <Link to="/dashboard">{t('navigation.dashboard')}</Link>
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="outline" className="no-underline font-inter">
                <Link to="/sign-in">{t('navigation.signIn')}</Link>
              </Button>
              <Button asChild className="no-underline font-inter">
                <Link to="/sign-up">{t('navigation.signUp')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button - Enhanced touch target */}
        <button
          className="md:hidden text-foreground p-3 -mr-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu - Improved layout and touch targets */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
          <div className="p-4 space-y-4">
            {/* Language Switcher in mobile menu */}
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>
            
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 py-3 border-b border-border">
                  {user?.avatar && (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="font-medium text-sm font-inter">{user?.name}</span>
                </div>
                <Button 
                  asChild 
                  className="w-full h-12 no-underline text-base font-inter" 
                  onClick={toggleMenu}
                >
                  <Link to="/dashboard">{t('navigation.dashboard')}</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 no-underline text-base font-inter" 
                  onClick={() => {
                    signOut();
                    toggleMenu();
                  }}
                >
                  {t('navigation.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full h-12 no-underline text-base font-inter" 
                  onClick={toggleMenu}
                >
                  <Link to="/sign-in">{t('navigation.signIn')}</Link>
                </Button>
                <Button 
                  asChild 
                  className="w-full h-12 no-underline text-base font-inter" 
                  onClick={toggleMenu}
                >
                  <Link to="/sign-up">{t('navigation.signUp')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
