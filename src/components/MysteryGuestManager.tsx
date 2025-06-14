import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Mail, Edit, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MysteryCharacter } from "@/interfaces/mystery";

interface CharacterAssignment {
  id?: string;
  character_id: string;
  guest_name: string;
  guest_email: string;
  is_sent: boolean;
  sent_at?: string;
}

interface MysteryGuestManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: MysteryCharacter[];
  mysteryId: string;
  mysteryTitle?: string;

}

const MysteryGuestManager: React.FC<MysteryGuestManagerProps> = ({
  open,
  onOpenChange,
  characters,
  mysteryId,
  mysteryTitle = "Your Mystery"
}) => {
  const [assignments, setAssignments] = useState<CharacterAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize assignments when dialog opens
  useEffect(() => {
    if (open && characters.length > 0) {
      loadExistingAssignments();
    }
  }, [open, characters, mysteryId]);

  const loadExistingAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('character_assignments')
        .select('*')
        .eq('mystery_id', mysteryId);

      if (error) throw error;

      // Create assignments array with existing data or empty defaults
      const assignmentMap = new Map(data?.map(a => [a.character_id, a]) || []);
      
      const newAssignments = characters.map(character => {
        const existing = assignmentMap.get(character.id);
        return existing ? {
          id: existing.id,
          character_id: character.id,
          guest_name: existing.guest_name,
          guest_email: existing.guest_email,
          is_sent: existing.is_sent,
          sent_at: existing.sent_at
        } : {
          character_id: character.id,
          guest_name: '',
          guest_email: '',
          is_sent: false
        };
      });

      setAssignments(newAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load existing assignments');
    }
  };

  const updateAssignment = (characterId: string, field: string, value: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.character_id === characterId 
        ? { ...assignment, [field]: value }
        : assignment
    ));
  };

  const isValidEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const canSend = (assignment: CharacterAssignment) => {
    return assignment.guest_name.trim() && 
           assignment.guest_email.trim() && 
           isValidEmail(assignment.guest_email) &&
           !assignment.is_sent;
  };

  const sendCharacterAssignment = async (assignment: CharacterAssignment) => {
    if (!canSend(assignment)) return;

    setLoading(true);
    try {
      const character = characters.find(c => c.id === assignment.character_id);
      if (!character) throw new Error('Character not found');

      // Save or update assignment in database
      const assignmentData = {
        mystery_id: mysteryId,
        character_id: assignment.character_id,
        guest_name: assignment.guest_name.trim(),
        guest_email: assignment.guest_email.trim(),
        is_sent: true,
        sent_at: new Date().toISOString()
      };

      let result;
      if (assignment.id) {
        // Update existing
        result = await supabase
          .from('character_assignments')
          .update(assignmentData)
          .eq('id', assignment.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('character_assignments')
          .insert(assignmentData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local state
      setAssignments(prev => prev.map(a => 
        a.character_id === assignment.character_id 
          ? { ...a, id: result.data.id, is_sent: true, sent_at: result.data.sent_at }
          : a
      ));
      
      // Call the Edge Function to send the email
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-character-email', {
        body: {
          guest_email: assignment.guest_email.trim(),
          guest_name: assignment.guest_name.trim(),
          character_name: character.character_name,
          character_details: character.description?.substring(0, 200) + '...' || 'Mystery character details...',
          access_token: result.data.access_token || 'temp-token',
          mystery_title: mysteryTitle
        }
      });
    
      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`);
      }
      toast.success(`Character sent to ${assignment.guest_name}!`);

    } catch (error) {
      console.error('Error sending assignment:', error);
      toast.error('Failed to send character assignment');
    } finally {
      setLoading(false);
    }
  };

  const editAssignment = async (assignment: CharacterAssignment) => {
    if (!assignment.id) return;

    try {
      // Update database to mark as not sent
      const { error } = await supabase
        .from('character_assignments')
        .update({ is_sent: false, sent_at: null })
        .eq('id', assignment.id);

      if (error) throw error;

      // Update local state
      setAssignments(prev => prev.map(a => 
        a.character_id === assignment.character_id 
          ? { ...a, is_sent: false, sent_at: undefined }
          : a
      ));

    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const sendAllAssignments = async () => {
    const validAssignments = assignments.filter(a => canSend(a));
    if (validAssignments.length === 0) {
      toast.error('No valid assignments to send');
      return;
    }

    setLoading(true);
    try {
      for (const assignment of validAssignments) {
        await sendCharacterAssignment(assignment);
      }
      toast.success(`Sent ${validAssignments.length} character assignments!`);
    } catch (error) {
      toast.error('Failed to send some assignments');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean character description
  const cleanCharacterDescription = (description: string): string => {
    if (!description) return '';
    
    // Remove "## CHARACTER DESCRIPTION" prefix if present
    const cleanedDescription = description.replace(/^##\s*CHARACTER\s*DESCRIPTION\s*/i, '').trim();
    
    return cleanedDescription;
  };

  const assignedCount = assignments.filter(a => a.guest_name.trim() && a.guest_email.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Share Characters with Guests</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Assign each character to a guest and send via email
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Character</TableHead>
                <TableHead className="w-[20%]">Guest Name</TableHead>
                <TableHead className="w-[25%]">Email</TableHead>
                <TableHead className="w-[30%]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const character = characters.find(c => c.id === assignment.character_id);
                if (!character) return null;

                const isLocked = assignment.is_sent;
                const canSendThis = canSend(assignment);

                // Clean the character description
                const cleanedDescription = cleanCharacterDescription(character.description || '');
                const truncatedDescription = cleanedDescription.length > 60 
                  ? `${cleanedDescription.substring(0, 60)}...`
                  : cleanedDescription;

                return (
                  <TableRow key={character.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{character.character_name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {truncatedDescription}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        placeholder="Guest's name"
                        value={assignment.guest_name}
                        onChange={(e) => updateAssignment(character.id, 'guest_name', e.target.value)}
                        disabled={isLocked}
                        className={isLocked ? 'bg-muted' : ''}
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="email"
                        placeholder="guest@example.com"
                        value={assignment.guest_email}
                        onChange={(e) => updateAssignment(character.id, 'guest_email', e.target.value)}
                        disabled={isLocked}
                        className={isLocked ? 'bg-muted' : ''}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => editAssignment(assignment)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <div className="flex items-center text-green-600 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Sent
                            </div>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => sendCharacterAssignment(assignment)}
                            disabled={!canSendThis || loading}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="border-t pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {assignedCount} characters assigned
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={sendAllAssignments}
              disabled={loading || assignments.filter(a => canSend(a)).length === 0}
            >
              Send All
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MysteryGuestManager;
