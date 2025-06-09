import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  // Return null when user is authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <footer className="bg-muted/30 border-t py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2 no-underline">
              <span className="text-xl font-bold gradient-text">Murder Mystery Generator</span>
            </Link>
            <p className="text-muted-foreground">
              Craft captivating murder mysteries at the speed of imagination.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors no-underline">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors no-underline">
                  Support
                </Link>
              </li>
              {/* Showcase link removed as requested */}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors no-underline">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors no-underline">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} Murder Mystery Generator, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;