import { useState } from 'react';
import { APIKeySetup } from '@/components/APIKeySetup';
import { FileUpload } from '@/components/FileUpload';
import { MarkingSchemeInput } from '@/components/MarkingSchemeInput';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { MarkingResults } from '@/components/MarkingResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Settings } from 'lucide-react';
import { OpenAIService } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const Index = () => {
  const [apiKey, setApiKey] = useState<string>(() => 
    localStorage.getItem('openai_api_key') || ''
  );
  const [showSetup, setShowSetup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [markingScheme, setMarkingScheme] = useState<string>('');
  const [isSchemeGenerated, setIsSchemeGenerated] = useState(false);
  const [markingResults, setMarkingResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 'ocr', label: 'Extracting text from image', status: 'pending' },
    { id: 'scheme', label: 'Processing marking scheme', status: 'pending' },
    { id: 'marking', label: 'Marking student work', status: 'pending' },
  ]);

  const { toast } = useToast();

  const handleAPIKeySetup = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
    setShowSetup(false);
  };

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status']) => {
    setProcessingSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setOcrText('');
    setMarkingResults(null);
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentProgress(0);
    updateProcessingStep('ocr', 'processing');

    try {
      const openaiService = new OpenAIService(apiKey);
      const base64Image = await fileToBase64(file);
      
      setCurrentProgress(25);
      const ocrResponse = await openaiService.extractTextFromImage(base64Image);
      
      if (ocrResponse.success && ocrResponse.text) {
        setOcrText(ocrResponse.text);
        updateProcessingStep('ocr', 'completed');
        setCurrentProgress(50);
        
        toast({
          title: "OCR Complete",
          description: "Text extracted successfully from the image",
        });
      } else {
        throw new Error(ocrResponse.error || 'Failed to extract text');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      updateProcessingStep('ocr', 'error');
      toast({
        title: "OCR Failed",
        description: error instanceof Error ? error.message : 'Failed to extract text',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCurrentProgress(100);
    }
  };

  const handleSchemeChange = async (scheme: string, isGenerated: boolean) => {
    if (isGenerated && ocrText && apiKey) {
      // Generate scheme
      setIsProcessing(true);
      updateProcessingStep('scheme', 'processing');
      
      try {
        const openaiService = new OpenAIService(apiKey);
        const schemeResponse = await openaiService.generateMarkingScheme(ocrText);
        
        if (schemeResponse.success && schemeResponse.scheme) {
          setMarkingScheme(schemeResponse.scheme);
          setIsSchemeGenerated(true);
          updateProcessingStep('scheme', 'completed');
          
          toast({
            title: "Scheme Generated",
            description: "AI marking scheme created successfully",
          });
        } else {
          throw new Error(schemeResponse.error || 'Failed to generate scheme');
        }
      } catch (error) {
        console.error('Scheme Generation Error:', error);
        updateProcessingStep('scheme', 'error');
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : 'Failed to generate scheme',
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      setMarkingScheme(scheme);
      setIsSchemeGenerated(false);
    }
  };

  const handleStartMarking = async () => {
    if (!ocrText || !markingScheme || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have uploaded work and provided a marking scheme",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentProgress(0);
    updateProcessingStep('marking', 'processing');

    try {
      const openaiService = new OpenAIService(apiKey);
      setCurrentProgress(50);
      
      const markingResponse = await openaiService.markStudentWork(ocrText, markingScheme);
      
      if (markingResponse.success) {
        setMarkingResults(markingResponse);
        updateProcessingStep('marking', 'completed');
        setCurrentProgress(100);
        
        toast({
          title: "Marking Complete",
          description: "Student work has been marked successfully",
        });
      } else {
        throw new Error(markingResponse.error || 'Failed to mark work');
      }
    } catch (error) {
      console.error('Marking Error:', error);
      updateProcessingStep('marking', 'error');
      toast({
        title: "Marking Failed",
        description: error instanceof Error ? error.message : 'Failed to mark student work',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!apiKey || showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <APIKeySetup onSetup={handleAPIKeySetup} apiKey={apiKey} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Teacher's Marking Assistant</h1>
                <p className="text-sm text-muted-foreground">AI-powered handwriting analysis and marking</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSetup(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              API Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* File Upload */}
          <FileUpload 
            onFileSelect={handleFileSelect} 
            disabled={isProcessing}
          />

          {/* Processing Status */}
          {(ocrText || isProcessing) && (
            <ProcessingStatus 
              steps={processingSteps}
              currentProgress={currentProgress}
            />
          )}

          {/* OCR Results Preview */}
          {ocrText && !markingResults && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Extracted Text Preview</CardTitle>
                <CardDescription>
                  Review the text extracted from the handwritten work
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{ocrText}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marking Scheme Input */}
          {ocrText && !markingResults && (
            <MarkingSchemeInput
              onSchemeChange={handleSchemeChange}
              ocrText={ocrText}
              disabled={isProcessing}
            />
          )}

          {/* Start Marking Button */}
          {ocrText && markingScheme && !markingResults && (
            <div className="text-center">
              <Button
                onClick={handleStartMarking}
                disabled={isProcessing}
                size="lg"
                className="min-w-[200px]"
              >
                {isProcessing ? 'Marking...' : 'Start Marking'}
              </Button>
            </div>
          )}

          {/* Marking Results */}
          {markingResults && (
            <MarkingResults
              results={markingResults.results || []}
              ocrText={ocrText}
              totalMarks={markingResults.totalMarks || 0}
              maxTotalMarks={markingResults.maxTotalMarks || 0}
              overallFeedback={markingResults.overallFeedback || ''}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;