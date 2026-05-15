import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Upload, FileText, Loader as Loader2, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabaseAdmin } from '../lib/supabase';
import { MarkingSchemeService } from '../services/markingSchemeService';

interface BatchUploadProps {
  apiKey: string;
  onBatchCreated: (batchJobId: string, markingSchemeContent: string) => void;
}

export function BatchUpload({ apiKey, onBatchCreated }: BatchUploadProps) {
  const [batchName, setBatchName] = useState('');
  const [markingSchemeType, setMarkingSchemeType] = useState<'upload' | 'ai' | 'manual'>('upload');
  const [markingSchemeFile, setMarkingSchemeFile] = useState<File | null>(null);
  const [markingSchemeText, setMarkingSchemeText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessingScheme, setIsProcessingScheme] = useState(false);
  const { toast } = useToast();

  const handleMarkingSchemeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMarkingSchemeFile(file);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      toast({
        title: "Batch Name Required",
        description: "Please enter a name for this batch",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingScheme(true);

    try {
      let markingSchemeContent = '';
      let isAiGenerated = false;
      let originalFilename = '';
      let fileType = '';

      if (markingSchemeType === 'upload') {
        if (!markingSchemeFile) {
          toast({
            title: "File Required",
            description: "Please upload a marking scheme file",
            variant: "destructive"
          });
          setIsProcessingScheme(false);
          return;
        }

        const schemeService = new MarkingSchemeService(apiKey);
        const result = await schemeService.parseMarkingScheme(markingSchemeFile);

        if (!result.success || !result.content) {
          toast({
            title: "Parse Error",
            description: result.error || "Failed to parse marking scheme",
            variant: "destructive"
          });
          setIsProcessingScheme(false);
          return;
        }

        markingSchemeContent = result.content;
        originalFilename = markingSchemeFile.name;
        fileType = markingSchemeFile.name.split('.').pop() || '';

      } else if (markingSchemeType === 'ai') {
        if (!aiPrompt.trim()) {
          toast({
            title: "Prompt Required",
            description: "Please describe what you want to assess",
            variant: "destructive"
          });
          setIsProcessingScheme(false);
          return;
        }

        const schemeService = new MarkingSchemeService(apiKey);
        const result = await schemeService.generateMarkingScheme(aiPrompt);

        if (!result.success || !result.content) {
          toast({
            title: "Generation Error",
            description: result.error || "Failed to generate marking scheme",
            variant: "destructive"
          });
          setIsProcessingScheme(false);
          return;
        }

        markingSchemeContent = result.content;
        isAiGenerated = true;
        fileType = 'ai-generated';

      } else {
        if (!markingSchemeText.trim()) {
          toast({
            title: "Marking Scheme Required",
            description: "Please enter a marking scheme",
            variant: "destructive"
          });
          setIsProcessingScheme(false);
          return;
        }

        markingSchemeContent = markingSchemeText;
        fileType = 'manual';
      }

      const { data: schemeData, error: schemeError } = await supabaseAdmin
        .from('marking_schemes')
        .insert({
          name: batchName,
          content: markingSchemeContent,
          original_filename: originalFilename,
          file_type: fileType,
          is_ai_generated: isAiGenerated
        })
        .select()
        .maybeSingle();

      if (schemeError) throw schemeError;
      if (!schemeData) throw new Error('Failed to create marking scheme');

      const { data: batchData, error: batchError } = await supabaseAdmin
        .from('batch_jobs')
        .insert({
          name: batchName,
          marking_scheme_id: schemeData.id,
          status: 'pending',
          total_students: 0,
          processed_students: 0
        })
        .select()
        .maybeSingle();

      if (batchError) throw batchError;
      if (!batchData) throw new Error('Failed to create batch job');

      toast({
        title: "Batch Created",
        description: "Ready to upload student assessments"
      });

      onBatchCreated(batchData.id, markingSchemeContent);

    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create batch",
        variant: "destructive"
      });
    } finally {
      setIsProcessingScheme(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Batch Marking Job</CardTitle>
        <CardDescription>
          Set up a marking scheme and prepare to process multiple student assessments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="batchName">Batch Name</Label>
          <Input
            id="batchName"
            placeholder="e.g., Class 10A - Math Test 1"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>Marking Scheme</Label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={markingSchemeType === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarkingSchemeType('upload')}
            >
              Upload File
            </Button>
            <Button
              type="button"
              variant={markingSchemeType === 'ai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarkingSchemeType('ai')}
            >
              AI Generate
            </Button>
            <Button
              type="button"
              variant={markingSchemeType === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarkingSchemeType('manual')}
            >
              Manual Entry
            </Button>
          </div>

          {markingSchemeType === 'upload' && (
            <div>
              <Label htmlFor="schemeFile">Upload Marking Scheme</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="schemeFile"
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.bmp,.csv,.html,.htm,.md,.markdown"
                  onChange={handleMarkingSchemeFileChange}
                />
                {markingSchemeFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMarkingSchemeFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Supported: PDF, DOCX, TXT, CSV, HTML, MD, or images (JPG, PNG, WEBP, HEIC, BMP)
              </p>
            </div>
          )}

          {markingSchemeType === 'ai' && (
            <div>
              <Label htmlFor="aiPrompt">Describe the Assessment</Label>
              <Textarea
                id="aiPrompt"
                placeholder="E.g., Create a marking scheme for a Year 10 essay on environmental pollution. Total marks: 20. Award marks for: introduction (3), main arguments (10), use of examples (4), conclusion (3)."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {markingSchemeType === 'manual' && (
            <div>
              <Label htmlFor="schemeText">Enter Marking Scheme</Label>
              <Textarea
                id="schemeText"
                placeholder="Enter your marking scheme here..."
                value={markingSchemeText}
                onChange={(e) => setMarkingSchemeText(e.target.value)}
                rows={6}
              />
            </div>
          )}
        </div>

        <Button
          onClick={handleCreateBatch}
          disabled={isProcessingScheme}
          className="w-full"
        >
          {isProcessingScheme ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Create Batch
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
