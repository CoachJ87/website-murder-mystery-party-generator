
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { importCharacterBatch } from "@/utils/batchCharacterImport";
import { Loader2, Upload } from "lucide-react";

interface ImportCharactersButtonProps {
  packageId: string;
  onComplete?: () => void;
}

export function ImportCharactersButton({ packageId, onComplete }: ImportCharactersButtonProps) {
  const [open, setOpen] = useState(false);
  const [characterText, setCharacterText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!characterText.trim()) {
      toast.error("Please paste character data first");
      return;
    }

    setIsImporting(true);
    try {
      const success = await importCharacterBatch(packageId, characterText);
      if (success) {
        setOpen(false);
        if (onComplete) onComplete();
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Characters
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Character Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste the complete character text data below. Make sure each character section includes a header with the character name followed by "- CHARACTER GUIDE".
          </p>
          <Textarea
            placeholder="Paste character data here..."
            className="min-h-[300px] font-mono text-sm"
            value={characterText}
            onChange={(e) => setCharacterText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>Import Characters</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportCharactersButton;
