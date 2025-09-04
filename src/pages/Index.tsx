import { useState } from 'react';
import { APIKeySetup } from '@/components/APIKeySetup';
import { FileUpload } from '@/components/FileUpload';
import { MarkingSchemeInput } from '@/components/MarkingSchemeInput';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { MarkingResults } from '@/components/MarkingResults';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Settings, Upload, Zap, CheckCircle, Shield, BookOpen } from 'lucide-react';
import { OpenAIService } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';
import heroBackground from '@/assets/hero-background.jpg';
import clarenceLogo from '@/assets/clarence-logo.png';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
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

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
    setOcrText('');
    setMarkingResults(null);
    setCurrentFileIndex(null);
    // Reset processing steps
    setProcessingSteps([
      { id: 'ocr', label: 'Extracting text from image', status: 'pending' },
      { id: 'scheme', label: 'Processing marking scheme', status: 'pending' },
      { id: 'marking', label: 'Marking student work', status: 'pending' },
    ]);
  };

  const processFile = async (fileIndex: number) => {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    
    setCurrentFileIndex(fileIndex);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div 
        className="relative min-h-[50vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Magic Marking AI Tool
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Transform handwritten student work into detailed assessments with AI-powered OCR and intelligent marking
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 justify-center">
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-foreground font-medium">Upload & Extract</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-foreground font-medium">AI Analysis</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-foreground font-medium">Instant Results</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Consolidated Information Tabs */}
          <Card className="shadow-soft border-primary/20">
            <CardContent className="p-0">
              <Tabs defaultValue="setup" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-none rounded-t-lg h-12">
                  <TabsTrigger value="setup" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Setup
                  </TabsTrigger>
                  <TabsTrigger value="how-it-works" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    How It Works
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="setup" className="p-6 mt-0">
                  {(!apiKey || showSetup) ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-2">OpenAI API Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Enter your OpenAI API key to enable OCR and intelligent marking capabilities
                        </p>
                      </div>
                      <APIKeySetup onSetup={handleAPIKeySetup} apiKey={apiKey} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <h3 className="text-lg font-semibold text-success">API Key Configured</h3>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowSetup(true)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      </div>
                      <p className="text-sm text-success/80">
                        Ready to process student work with AI-powered marking
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="how-it-works" className="p-6 mt-0">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">1. Upload Student Work</h4>
                      <p className="text-sm text-muted-foreground">Upload handwritten assignments as images, PDFs, or DOCX files. Camera capture supported.</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">2. AI Text Extraction</h4>
                      <p className="text-sm text-muted-foreground">Advanced OCR extracts text from handwriting with high accuracy, including mathematical notation.</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">3. Intelligent Marking</h4>
                      <p className="text-sm text-muted-foreground">Generate marking schemes automatically or use custom ones with detailed feedback and scores.</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="security" className="p-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Security & Compliance</h3>
                      <div className="grid sm:grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-success/5 rounded-lg border border-success/20">
                          <div className="text-xs font-medium text-success">✓ Zero Server Storage</div>
                        </div>
                        <div className="text-center p-3 bg-success/5 rounded-lg border border-success/20">
                          <div className="text-xs font-medium text-success">✓ FERPA/COPPA Aligned</div>
                        </div>
                        <div className="text-center p-3 bg-success/5 rounded-lg border border-success/20">
                          <div className="text-xs font-medium text-success">✓ Direct API Integration</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Client-side processing ensures student data never touches our servers. All processing happens directly through OpenAI's secure API.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <PrivacyPolicy />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* File Upload */}
          <FileUpload 
            onFilesSelect={handleFilesSelect} 
            disabled={isProcessing}
          />

          {/* Selected Files List */}
          {selectedFiles.length > 0 && !markingResults && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Selected Files ({selectedFiles.length})</CardTitle>
                <CardDescription>
                  Choose a file to process for OCR and marking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => processFile(index)}
                        disabled={isProcessing}
                        size="sm"
                        variant={currentFileIndex === index ? "default" : "outline"}
                      >
                        {currentFileIndex === index && isProcessing ? 'Processing...' : 'Process'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
        
        {/* Footer */}
        <footer className="mt-16 border-t pt-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-sm text-muted-foreground">Proudly made by:</span>
              <a 
                href="https://clarence.guru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img 
                  src={clarenceLogo} 
                  alt="Clarence.guru" 
                  className="h-12 w-12 rounded-lg object-cover shadow-md"
                />
              </a>
            </div>
            
            {/* PayPal Donate Button */}
            <div className="mb-6">
              <form action="https://www.paypal.com/donate" method="post" target="_top" className="inline-block">
                <input type="hidden" name="hosted_button_id" value="PSXE6LDM3ZJDC" />
                <input 
                  type="image" 
                  src="https://www.paypalobjects.com/en_AU/i/btn/btn_donateCC_LG.gif" 
                  style={{ border: 0 }} 
                  name="submit" 
                  title="PayPal - The safer, easier way to pay online!" 
                  alt="Donate with PayPal button"
                  className="hover:opacity-80 transition-opacity"
                />
                <img alt="" style={{ border: 0 }} src="https://www.paypal.com/en_AU/i/scr/pixel.gif" width="1" height="1" />
              </form>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                Magic Marking AI Tool
              </p>
              <p className="text-xs text-muted-foreground">
                Empowering educators with intelligent assessment technology
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;