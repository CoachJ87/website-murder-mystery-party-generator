import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Define your form schema
const formSchema = z.object({
 title: z.string().min(3, { message: "Title must be at least 3 characters." }),
 theme: z.string().min(3, { message: "Theme must be at least 3 characters." }),
 playerCount: z.number().min(8, { message: "Minimum 8 players" }).max(15, { message: "Maximum 15 players" }),
 accomplice: z.boolean().optional(),
 scriptFormat: z.enum(["full", "point"]),
});

export type FormValues = z.infer<typeof formSchema>;

interface MysteryFormProps {
 onSave: (data: FormValues) => void;
 isSaving: boolean;
 initialData?: FormValues;
}

const MysteryForm: React.FC<MysteryFormProps> = ({ onSave, isSaving, initialData }) => {
 const form = useForm<FormValues>({
   resolver: zodResolver(formSchema),
   defaultValues: initialData || {
     title: "",
     theme: "",
     playerCount: 8,
     accomplice: false,
     scriptFormat: "full",
   },
 });

 const { handleSubmit, control, formState: { errors } } = form;

 const onSubmit = (data: FormValues) => {
   onSave(data);
 };

 return (
   <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
     <div>
       <Label htmlFor="title">Title</Label>
       <Input id="title" name="title" {...control.register("title")} />
       {errors.title && <p className="text-red-500">{errors.title.message}</p>}
     </div>
     <div>
       <Label htmlFor="theme">Theme</Label>
       <Textarea id="theme" name="theme" {...control.register("theme")} />
       {errors.theme && <p className="text-red-500">{errors.theme.message}</p>}
     </div>
     <div>
       <Label htmlFor="playerCount">Player Count (8-15)</Label>
       <Input
         type="number"
         id="playerCount"
         name="playerCount"
         {...control.register("playerCount", { valueAsNumber: true })}
       />
       {errors.playerCount && <p className="text-red-500">{errors.playerCount.message}</p>}
     </div>
     {/* Add other form fields similarly */}
     <Button type="submit" disabled={isSaving}>
       {isSaving ? "Saving..." : "Save"}
     </Button>
   </form>
 );
};

export default MysteryForm;
