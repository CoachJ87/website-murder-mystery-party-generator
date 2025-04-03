
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface SignInPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignInPrompt = ({ isOpen, onClose }: SignInPromptProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Sign in to continue</DialogTitle>
          <DialogDescription className="text-center pt-2">
            To create your own custom murder mystery, create an account or log into an existing one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 pt-4">
          <Button className="w-full" asChild>
            <Link to="/sign-up">Sign Up</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInPrompt;
