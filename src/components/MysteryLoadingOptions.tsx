
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MysteryLoadingOptionsProps {
    onOptionsChange?: (options: { hasAccomplice: boolean; scriptType: 'full' | 'pointForm' }) => void;
    isLoading?: boolean;
}

const MysteryLoadingOptions = ({ onOptionsChange, isLoading }: MysteryLoadingOptionsProps) => {
    const [hasAccomplice, setHasAccomplice] = useState(false);
    const [scriptType, setScriptType] = useState<'full' | 'pointForm'>('full');

    const handleAccompliceChange = (checked: boolean) => {
        setHasAccomplice(checked);
        onOptionsChange?.({ hasAccomplice: checked, scriptType });
    };

    const handleScriptTypeChange = (value: 'full' | 'pointForm') => {
        setScriptType(value);
        onOptionsChange?.({ hasAccomplice, scriptType: value });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Include an accomplice?</Label>
                                <p className="text-sm text-muted-foreground">
                                    Would you like to include an accomplice mechanism where two players
                                    work together as the murderer and accomplice?
                                </p>
                            </div>
                            <Switch
                                checked={hasAccomplice}
                                onCheckedChange={handleAccompliceChange}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>
                                Would you prefer full scripts or point form summaries for character guidance?
                            </Label>
                            <RadioGroup
                                value={scriptType}
                                onValueChange={(value: 'full' | 'pointForm') => handleScriptTypeChange(value)}
                                className="flex flex-col space-y-1"
                            >
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="full" id="full" />
                                    <Label htmlFor="full" className="font-normal">
                                        Full Scripts (Detailed character dialogue and directions)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="pointForm" id="pointForm" />
                                    <Label htmlFor="pointForm" className="font-normal">
                                        Point Form Summaries (Bullet points with key information)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MysteryLoadingOptions;
