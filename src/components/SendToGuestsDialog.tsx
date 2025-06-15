
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Character = {
  name: string;
  role: string;
  description: string;
};

interface SendToGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
}

const SendToGuestsDialog: React.FC<SendToGuestsDialogProps> = ({ open, onOpenChange, characters }) => {
  const { t } = useTranslation();
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sentCharacters, setSentCharacters] = useState<string[]>([]);

  const handleEmailChange = (characterName: string, email: string) => {
    setEmails(prev => ({ ...prev, [characterName]: email }));
  };

  const isValidEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleSendAll = async () => {
    setSending(true);
    
    try {
      // Filter out empty emails and combine with character names
      const charactersToSend = Object.entries(emails)
        .filter(([_, email]) => email && isValidEmail(email))
        .map(([characterName, email]) => ({ 
          character: characters.find(c => c.name === characterName),
          email 
        }));
      
      if (charactersToSend.length === 0) {
        toast.error(t("sendToGuests.errors.noValidEmails"));
        setSending(false);
        return;
      }
      
      // In a real app, this would call an API endpoint to send emails
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Record which characters were sent emails
      setSentCharacters(prev => [
        ...prev,
        ...charactersToSend.map(c => c.character?.name || "")
      ]);
      
      toast.success(t("sendToGuests.success.sentCount", { count: charactersToSend.length }));
    } catch (error) {
      toast.error(t("sendToGuests.errors.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  // Helper to check if a character has been sent an email
  const hasBeenSent = (characterName: string) => {
    return sentCharacters.includes(characterName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <span>{t("sendToGuests.title")}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-6">
            {t("sendToGuests.description")}
          </p>
          
          <div className="space-y-4">
            {characters.map((character) => (
              <div 
                key={character.name} 
                className={`p-4 border rounded-lg ${hasBeenSent(character.name) ? 'bg-muted/30' : ''}`}
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                  <div>
                    <Label className="font-medium">{character.name}</Label>
                    <p className="text-sm text-muted-foreground">{character.role}</p>
                  </div>
                  
                  <div className="w-full sm:w-auto flex-1 sm:max-w-[280px] flex items-center gap-2">
                    {hasBeenSent(character.name) ? (
                      <div className="flex items-center text-green-500 gap-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">{t("sendToGuests.status.sent")}</span>
                      </div>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          type="email"
                          placeholder={t("sendToGuests.emailPlaceholder")}
                          value={emails[character.name] || ""}
                          onChange={(e) => handleEmailChange(character.name, e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.buttons.close")}
          </Button>
          <Button onClick={handleSendAll} disabled={sending}>
            {sending ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                {t("sendToGuests.buttons.sending")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("sendToGuests.buttons.send")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendToGuestsDialog;
