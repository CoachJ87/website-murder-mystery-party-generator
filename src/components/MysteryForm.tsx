import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Define the schema validation (REMOVED hasAccomplice):
const formSchema = z.object({
  userRequest: z.string().optional(),
  theme: z.string().optional(),
  playerCount: z.coerce
    .number()
    .int()
    .min(4, { message: "Minimum 4 players required" })
    .max(32, { message: "Maximum 32 players allowed" }),
  scriptType: z.enum(["full", "pointForm"], {
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
        scriptType: initialData.scriptType || "full",
        additionalDetails: initialData.additionalDetails || ""
      });
    }
  }, [initialData, form]);
  const onSubmit = (data: FormData) => {
    console.log("Form submitted with data:", data);
    onSave(data);
  };
  return <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* NEW: User's original request field - ONLY show if we have a userRequest */}
                {initialData?.userRequest && <FormField control={form.control} name="userRequest" render={({
        field
      }) => <FormItem>
                                <FormLabel>What you want to create</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled className="bg-muted" />
                                </FormControl>
                                <FormDescription>
                                    Your original request from the homepage
                                </FormDescription>
                            </FormItem>} />}

                <FormField control={form.control} name="theme" render={({
        field
      }) => <FormItem>
                            <FormLabel>Theme/Setting Details (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., time period, setting specifics, must-have's, etc." {...field} />
                            </FormControl>
                            <FormDescription>
                                Choose a specific theme or setting for your murder mystery
                            </FormDescription>
                            <FormMessage />
                        </FormItem>} />

                <FormField control={form.control} name="playerCount" render={({
        field
      }) => <FormItem>
                            <FormLabel>
                                How many players will participate? (4-32)
                            </FormLabel>
                            <FormControl>
                                <Input type="number" min={4} max={32} {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter a specific, whole number between 4 and 32 players.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>} />

                <FormField control={form.control} name="scriptType" render={({
        field
      }) => <FormItem className="space-y-3">
                            <FormLabel>Script Detail Level</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="full" id="full" />
                                        <Label htmlFor="full">Full Scripts - Complete dialogue and detailed instructions</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="pointForm" id="pointForm" />
                                        <Label htmlFor="pointForm">Point Form - Key points and bullet summaries</Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>} />

                <FormField control={form.control} name="additionalDetails" render={({
        field
      }) => <FormItem>
                            <FormLabel>Additional Details (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Any specific requirements, special rules, or additional context for your mystery..." className="resize-none" {...field} />
                            </FormControl>
                            <FormDescription>
                                Provide any extra details or special requests for your mystery
                            </FormDescription>
                            <FormMessage />
                        </FormItem>} />

                <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? "Generating Mystery..." : "Generate Mystery"}
                </Button>
            </form>
        </Form>;
};
export default MysteryForm;
