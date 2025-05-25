// In the formSchema, change the playerCount validation:
playerCount: z.coerce
    .number()
    .int()
    .min(4, { message: "Minimum 4 players required" })  // Changed from 2 to 4
    .max(32, { message: "Maximum 32 players allowed" }), // Changed from 40 to 32

// And update the FormField:
<FormField
    control={form.control}
    name="playerCount"
    render={({ field }) => (
        <FormItem>
            <FormLabel>
                How many players will participate? (4-32)  {/* Update label */}
            </FormLabel>
            <FormControl>
                <Input
                    type="number"
                    min={4}    {/* Changed from 2 */}
                    max={32}   {/* Changed from 40 */}
                    {...field}
                />
            </FormControl>
            <FormDescription>
                Enter a specific, whole number between 4 and 32 players.  {/* Update description */}
            </FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>

// And update the defaultValues:
defaultValues: {
    theme: initialData?.theme || "",
    playerCount: initialData?.playerCount || 6,  // Changed from 8 to 6
    hasAccomplice: initialData?.hasAccomplice || false,
    scriptType: initialData?.scriptType || "full",
    additionalDetails: initialData?.additionalDetails || "",
},
