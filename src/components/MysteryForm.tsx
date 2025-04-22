import { useState } from "react"; // Likely not needed
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Zap } from "lucide-react";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
    theme: z.string().min(2, { message: "Theme is required" }),
    playerCount: z.coerce
        .number()
        .int()
        .min(2, { message: "Minimum 2 players required" })
        .max(40, { message: "Maximum 40 players allowed" }),
    additionalDetails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MysteryFormProps {
    onSave: (data: FormValues) => void;
    isSaving: boolean;
    initialData?: Partial<FormValues>;
}

const themes = [
    "1920s Speakeasy",
    "Hollywood Murder",
    "Castle Mystery",
    "Sci-Fi Mystery",
    "Art Gallery",
    "Luxury Train",
    "Mountain Resort",
    "Haunted Mansion",
    "Cruise Ship",
    "Medieval Banquet",
    "Wild West Saloon",
];

const MysteryForm = ({ onSave, isSaving, initialData }: MysteryFormProps) => {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            theme: initialData?.theme || "",
            playerCount: initialData?.playerCount || 8,
            additionalDetails: initialData?.additionalDetails || "",
        },
    });

    const handleSubmit = (data: FormValues) => {
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                What theme would you like for the murder mystery?
                            </FormLabel>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {themes.map((theme) => (
                                    <Button
                                        key={theme}
                                        type="button"
                                        variant={
                                            field.value === theme
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => form.setValue("theme", theme)}
                                        className="mb-1"
                                    >
                                        {theme}
                                    </Button>
                                ))}
                            </div>
                            <FormControl>
                                <Input
                                    placeholder="Or type your own theme..."
                                    {...field}
                                    className="mt-2"
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
                            <FormLabel>
                                How many players will participate? (Max. 40)
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={2}
                                    max={40}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Enter a specific, whole number between 2 and 40.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="additionalDetails"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Any other details you'd like to add? (Optional)
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter any special requirements, character ideas, or plot elements..."
                                    className="resize-none"
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
                    className="w-full"
                >
                    {isSaving ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                        <Zap className="h-4 w-4 mr-2" />
                    )}
                    Generate Mystery
                </Button>
            </form>
        </Form>
    );
};

export default MysteryForm;
