import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Wand2 } from 'lucide-react';

interface MarkingSchemeInputProps {
  onSchemeChange: (scheme: string, isGenerated: boolean) => void;
  ocrText?: string;
  disabled?: boolean;
}

export const MarkingSchemeInput = ({ onSchemeChange, ocrText, disabled }: MarkingSchemeInputProps) => {
  const [customScheme, setCustomScheme] = useState('');
  const [activeTab, setActiveTab] = useState('custom');

  const handleCustomSchemeChange = (value: string) => {
    setCustomScheme(value);
    onSchemeChange(value, false);
  };

  const handleGenerateScheme = () => {
    if (!ocrText) return;
    onSchemeChange('', true); // Empty string with isGenerated=true signals to generate
  };

  return (
    <Card className="w-full shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Marking Scheme
        </CardTitle>
        <CardDescription>
          Provide a marking scheme or let AI generate one based on the student work
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Custom Scheme</TabsTrigger>
            <TabsTrigger value="generate" disabled={!ocrText}>AI Generated</TabsTrigger>
          </TabsList>
          
          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-scheme">Enter your marking scheme</Label>
              <Textarea
                id="custom-scheme"
                placeholder="Example:
- Question 1: Define photosynthesis (5 marks)
  - Must mention light energy (2 marks)
  - Must mention CO2 and water (2 marks)
  - Must mention glucose production (1 mark)
  
- Question 2: Explain cellular respiration (10 marks)
  - Definition (3 marks)
  - Process steps (4 marks)
  - Energy output (3 marks)"
                value={customScheme}
                onChange={(e) => handleCustomSchemeChange(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={disabled}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Be specific about point allocation and key concepts to look for in student answers.
            </p>
          </TabsContent>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="text-center py-8">
              <Wand2 className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-medium mb-2">AI-Generated Marking Scheme</h3>
              <p className="text-muted-foreground mb-6">
                {ocrText 
                  ? "Generate a marking scheme based on the uploaded student work"
                  : "Upload and process student work first to generate a marking scheme"
                }
              </p>
              <Button 
                onClick={handleGenerateScheme}
                disabled={!ocrText || disabled}
                className="min-w-[200px]"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Scheme
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};