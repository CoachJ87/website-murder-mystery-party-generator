
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the schema validation with updated scriptType enum:
const formSchema = z.object({
  userRequest: z.string().optional(),
  theme: z.string().optional(),
  playerCount: z.coerce.number().int().min(4, {
    message: "Minimum 4 players required"
  }).max(32, {
    message: "Maximum 32 players allowed"
  }),
  hasAccomplice: z.boolean().default(false),
  scriptType: z.enum(["full", "pointForm", "both"], {
    required_error: "Please select a script type"
  }),
  additionalDetails: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface MysteryFormProps {
  onSave: (data: FormData) => void;
  isSaving?: boolean;
  initialData?: Partial<FormData>;
}

const MysteryForm = ({
  onSave,
  isSaving = false,
  initialData
}: MysteryFormProps) => {
  // Add debugging
  console.log("=== MysteryForm Debug ===");
  console.log("initialData received:", initialData);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userRequest: initialData?.userRequest || "",
      theme: initialData?.theme || "",
      playerCount: initialData?.playerCount || 6,
      hasAccomplice: initialData?.hasAccomplice || false,
      scriptType: initialData?.scriptType || "full",
      additionalDetails: initialData?.additionalDetails || ""
    }
  });

  // Watch the theme value for debugging
  const currentTheme = form.watch("theme");
  console.log("Current theme value:", currentTheme);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log("Resetting form with initialData:", initialData);
      form.reset({
        userRequest: initialData.userRequest || "",
        theme: initialData.theme || "",
        playerCount: initialData.playerCount || 6,
        hasAccomplice: initialData.hasAccomplice || false,
        scriptType: initialData.scriptType || "full",
        additionalDetails: initialData.additionalDetails || ""
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: FormData) => {
    console.log("Form submitted with data:", data);
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
        {/* User's original request field - mobile optimized */}
        {initialData?.userRequest && (
          <FormField
            control={form.control}
            name="userRequest"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">What you want to create</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted text-sm sm:text-base h-10 sm:h-auto" />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  Your original request from the homepage
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-medium">Additional theme/setting details (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., time period, setting specifics, must-have's, etc." 
                  className="text-sm sm:text-base h-10 sm:h-auto"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="playerCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-medium">
                How many players will participate?
              </FormLabel>
              <FormDescription className="text-xs sm:text-sm">
              Detective does not count as a player. Host can choose to play as a suspect or as the detective. If host chooses to play as a suspect, game rules will change to accomodate this.
              </FormDescription>
              <FormControl>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                >
                  <SelectTrigger className="h-10 sm:h-auto text-sm sm:text-base">
                    <SelectValue placeholder="Select number of players" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 29 }, (_, i) => i + 4).map((num) => (
                      <SelectItem key={num} value={num.toString()} className="text-sm sm:text-base">
                        {num} players
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasAccomplice"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5 flex-1 pr-3">
                <FormLabel className="text-sm sm:text-base font-medium">
                  Include Accomplice Mechanism
                </FormLabel>
                <FormDescription className="text-xs sm:text-sm">
                  Creates an "accomplice" to the murderer. Best for games with 10 or more players.
                </FormDescription>
              </div>
              <FormControl>
                <Switch 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  className="shrink-0"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scriptType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm sm:text-base font-medium">Script Detail Level</FormLabel>
              <FormDescription className="text-xs sm:text-sm">
                  Defines how character responses should be formatted in the character guides.
                </FormDescription>
              <FormControl>
                <RadioGroup 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  className="flex flex-col space-y-3 sm:space-y-2"
                >
                  <div className="flex items-start space-x-3 py-2">
                    <RadioGroupItem value="full" id="full" className="mt-0.5 shrink-0" />
                    <Label htmlFor="full" className="text-sm sm:text-base leading-5 cursor-pointer">
                      Full Scripts - Complete dialogue (great for those who want more guidance)
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 py-2">
                    <RadioGroupItem value="pointForm" id="pointForm" className="mt-0.5 shrink-0" />
                    <Label htmlFor="pointForm" className="text-sm sm:text-base leading-5 cursor-pointer">
                      Point Form - Bullet summaries (great for those who love to improvise)
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 py-2">
                    <RadioGroupItem value="both" id="both" className="mt-0.5 shrink-0" />
                    <Label htmlFor="both" className="text-sm sm:text-base leading-5 cursor-pointer">
                      Both Formats - Full scripts AND point form notes
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="additionalDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-medium">Additional Details (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any specific requirements, special rules, or additional context for your mystery..." 
                  className="resize-none min-h-20 sm:min-h-24 text-sm sm:text-base" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSaving} 
          className="w-full h-12 text-base font-medium"
        >
          {isSaving ? "Starting Chat..." : "Generate Mystery Outline"}
        </Button>
      </form>
    </Form>
  );
};

export default MysteryForm;
