
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importCharacterBatch } from "@/utils/batchCharacterImport";
import { toast } from "sonner";
import { Clipboard, Upload, Loader2 } from "lucide-react";

interface ImportCharactersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  onImportComplete?: () => void;
}

const ImportCharactersDialog: React.FC<ImportCharactersDialogProps> = ({
  open,
  onOpenChange,
  packageId,
  onImportComplete
}) => {
  const [characterText, setCharacterText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCharacterText(text);
      toast.success("Text pasted from clipboard");
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      toast.error("Could not access clipboard. Please paste manually.");
    }
  };

  const handleImport = async () => {
    if (!characterText.trim()) {
      toast.error("Please enter or paste character data");
      return;
    }

    setIsImporting(true);
    try {
      const success = await importCharacterBatch(packageId, characterText);
      
      if (success) {
        toast.success("Characters imported successfully");
        setCharacterText("");
        onOpenChange(false);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        toast.error("Failed to import character data");
      }
    } catch (error) {
      console.error("Error importing characters:", error);
      toast.error("An unexpected error occurred during import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Character Data</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">
                Paste your character data below:
              </label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePaste}
                className="flex items-center gap-1"
              >
                <Clipboard className="h-4 w-4" />
                <span>Paste from Clipboard</span>
              </Button>
            </div>
            <Textarea
              value={characterText}
              onChange={(e) => setCharacterText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Paste CHARACTER GUIDE content here..."
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Character data should include sections for:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>CHARACTER DESCRIPTION</li>
              <li>BACKGROUND</li>
              <li>RELATIONSHIPS</li>
              <li>SECRETS</li>
              <li>WHEREABOUTS</li>
              <li>Round statements (ROUND 1, ROUND 2, etc.)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !characterText.trim()} 
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Import Characters</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCharactersDialog;
