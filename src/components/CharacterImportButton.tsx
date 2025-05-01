
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserRound, Upload } from "lucide-react";
import ImportCharactersDialog from "./ImportCharactersDialog";

interface CharacterImportButtonProps {
  packageId: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  onImportComplete?: () => void;
}

const CharacterImportButton: React.FC<CharacterImportButtonProps> = ({ 
  packageId, 
  variant = "default",
  size = "default",
  onImportComplete
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <UserRound className="h-4 w-4" />
        <span>Import Characters</span>
      </Button>

      <ImportCharactersDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        packageId={packageId} 
        onImportComplete={onImportComplete}
      />
    </>
  );
};

export default CharacterImportButton;
