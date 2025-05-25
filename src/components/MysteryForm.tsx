// Update the schema validation:
const formSchema = z.object({
    theme: z.string().min(2, { message: "Theme is required" }),
    playerCount: z.coerce
        .number()
        .int()
        .min(4, { message: "Minimum 4 players required" })    // Changed from 2
        .max(32, { message: "Maximum 32 players allowed" }),  // Changed from 40
    hasAccomplice: z.boolean().default(false),
    scriptType: z.enum(["full", "pointForm"], {
        required_error: "Please select a script type",
    }),
    additionalDetails: z.string().optional(),
});

// Update the form field:
<FormField
    control={form.control}
    name="playerCount"
    render={({ field }) => (
        <FormItem>
            <FormLabel>
                How many players will participate? (4-32)
            </FormLabel>
            <FormControl>
                <Input
                    type="number"
                    min={4}
                    max={32}
                    {...field}
                />
            </FormControl>
            <FormDescription>
                Enter a specific, whole number between 4 and 32 players.
            </FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>

// Update default values:
defaultValues: {
    theme: initialData?.theme || "",
    playerCount: initialData?.playerCount || 6,  // Changed default to 6
    hasAccomplice: initialData?.hasAccomplice || false,
    scriptType: initialData?.scriptType || "full",
    additionalDetails: initialData?.additionalDetails || "",
},
