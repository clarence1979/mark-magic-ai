import { useState, useEffect } from 'react';
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
import { cache } from '@/services/apiKeyCache';
import heroBackground from '@/assets/hero-background.jpg';
import clarenceLogo from '@/assets/clarence-logo.png';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const Index = () => {
  const [apiKey, setApiKey] = useState<string>(() => cache.apiKey);
  const [activeTab, setActiveTab] = useState('upload'); // Start with upload tab instead of setup
  const [showQuickSetup, setShowQuickSetup] = useState(false);
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

  // Auto-sync with cache on mount
  useEffect(() => {
    const cachedKey = cache.apiKey;
    if (cachedKey !== apiKey) {
      setApiKey(cachedKey);
    }
  }, []);

  const handleAPIKeySetup = (key: string) => {
    setApiKey(key);
    cache.apiKey = key;
    setShowQuickSetup(false);
    // Auto-advance to upload tab once API key is set
    if (!selectedFiles.length) {
      setActiveTab('upload');
    }
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
    // Auto-advance to process tab when files are selected
    setActiveTab('process');
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
    console.log('=== MARKING PROCESS START ===');
    console.log('State check:', { 
      ocrText: ocrText?.length || 0, 
      markingScheme: markingScheme?.length || 0, 
      apiKey: apiKey?.length || 0,
      activeTab,
      isProcessing 
    });
    
    if (!ocrText || !markingScheme || !apiKey) {
      console.log('Missing required data - aborting');
      toast({
        title: "Missing Information",
        description: "Please ensure you have uploaded work and provided a marking scheme",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting processing...');
    setIsProcessing(true);
    setCurrentProgress(0);
    updateProcessingStep('marking', 'processing');

    try {
      console.log('Creating OpenAI service...');
      const openaiService = new OpenAIService(apiKey);
      setCurrentProgress(50);
      
      console.log('Sending request to OpenAI...');
      console.log('OCR Text preview:', ocrText.substring(0, 100));
      console.log('Marking Scheme preview:', markingScheme.substring(0, 100));
      
      const markingResponse = await openaiService.markStudentWork(ocrText, markingScheme);
      console.log('=== RAW RESPONSE ===');
      console.log('Full response:', JSON.stringify(markingResponse, null, 2));
      
      if (markingResponse && markingResponse.success && markingResponse.results) {
        console.log('Response validation passed');
        console.log('Results count:', markingResponse.results.length);
        console.log('Sample result:', markingResponse.results[0]);
        
        console.log('Setting marking results...');
        setMarkingResults(markingResponse);
        
        console.log('Updating processing step...');
        updateProcessingStep('marking', 'completed');
        setCurrentProgress(100);
        
        console.log('Switching to results tab...');
        setActiveTab('results');
        
        console.log('Showing success toast...');
        toast({
          title: "Marking Complete",
          description: "Student work has been marked successfully",
        });
        
        console.log('=== MARKING PROCESS COMPLETE ===');
      } else {
        console.error('Response validation failed:');
        console.error('Success:', markingResponse?.success);
        console.error('Results:', markingResponse?.results);
        console.error('Error:', markingResponse?.error);
        throw new Error(markingResponse?.error || 'Invalid response from OpenAI');
      }
    } catch (error) {
      console.error('=== MARKING ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Full error:', error);
      
      updateProcessingStep('marking', 'error');
      
      let errorMessage = 'Failed to mark student work';
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key.';
        } else if (error.message.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.log('Showing error toast:', errorMessage);
      toast({
        title: "Marking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log('Cleaning up - setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div 
        className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent text-left">
              Magic Marking AI Tool
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-3xl mx-auto px-2">
            Transform handwritten student work into detailed assessments with AI-powered OCR and intelligent marking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm">
            <div className="flex items-center gap-2 justify-center">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-foreground font-medium">Upload & Extract</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-foreground font-medium">AI Analysis</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-foreground font-medium">Instant Results</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Quick Setup Bar - Only show when API key is missing */}
          {!apiKey && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                    <Settings className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-warning">API Key Required</p>
                    <p className="text-sm text-warning/80">Configure your OpenAI API key to start marking</p>
                  </div>
                </div>
                <Button onClick={() => setShowQuickSetup(true)} variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Setup API Key
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Setup Modal */}
          {showQuickSetup && (
            <Card className="shadow-medium border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Quick API Setup
                </CardTitle>
                <CardDescription>
                  Enter your OpenAI API key to enable AI-powered marking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <APIKeySetup onSetup={handleAPIKeySetup} apiKey={apiKey} />
              </CardContent>
            </Card>
          )}

          {/* Main Workflow Tabs */}
          <Card className="shadow-soft border-primary/20">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 rounded-none rounded-t-lg h-10 sm:h-12">
                  <TabsTrigger value="upload" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Upload</span>
                    <span className="sm:hidden">Up</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="process" 
                    disabled={selectedFiles.length === 0}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Process</span>
                    <span className="sm:hidden">Pro</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mark" 
                    disabled={!ocrText || !markingScheme}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Mark</span>
                    <span className="sm:hidden">Mk</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="results" 
                    disabled={!markingResults}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Results</span>
                    <span className="sm:hidden">Res</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="p-4 sm:p-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Upload Student Work</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload handwritten assignments, worksheets, or exam papers for AI analysis
                      </p>
                    </div>
                    <FileUpload 
                      onFilesSelect={handleFilesSelect} 
                      disabled={isProcessing || !apiKey}
                    />
                    {!apiKey && (
                      <div className="text-center p-4 bg-muted/50 rounded-lg border-2 border-dashed">
                        <p className="text-sm text-muted-foreground">Configure your API key first to enable file uploads</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="process" className="p-4 sm:p-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Process Files</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Extract text from your uploaded files using AI-powered OCR
                      </p>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{selectedFiles.length} file(s) selected</span>
                          <Button
                            onClick={() => selectedFiles.forEach((_, index) => processFile(index))}
                            disabled={isProcessing}
                            size="sm"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Process All
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate text-sm sm:text-base">{file.name}</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={() => processFile(index)}
                                disabled={isProcessing}
                                size="sm"
                                variant={currentFileIndex === index ? "default" : "outline"}
                                className="ml-2 flex-shrink-0"
                              >
                                <span className="hidden sm:inline">{currentFileIndex === index && isProcessing ? 'Processing...' : 'Process'}</span>
                                <span className="sm:hidden">{currentFileIndex === index && isProcessing ? '...' : 'Go'}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Processing Status */}
                    {(ocrText || isProcessing) && (
                      <ProcessingStatus 
                        steps={processingSteps}
                        currentProgress={currentProgress}
                      />
                    )}

                    {/* OCR Results Preview */}
                    {ocrText && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Extracted Text Preview</h4>
                          <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-muted p-3 sm:p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-xs sm:text-sm">{ocrText}</pre>
                          </div>
                        </div>
                        <div className="text-center">
                          <Button 
                            onClick={() => setActiveTab('mark')} 
                            size="lg"
                            className="w-full sm:w-auto"
                          >
                            Continue to Marking
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="mark" className="p-4 sm:p-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Create Marking Scheme & Mark Work</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate or provide a marking scheme, then let AI mark the student work
                      </p>
                    </div>
                    
                    {ocrText && (
                      <MarkingSchemeInput
                        onSchemeChange={handleSchemeChange}
                        ocrText={ocrText}
                        disabled={isProcessing}
                        generatedScheme={isSchemeGenerated ? markingScheme : undefined}
                      />
                    )}
                    
                    {/* Start Marking Button */}
                    {ocrText && markingScheme && (
                      <div className="text-center pt-4">
                        <Button
                          onClick={handleStartMarking}
                          disabled={isProcessing}
                          size="lg"
                          className="w-full sm:w-auto sm:min-w-[200px]"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isProcessing ? 'Marking...' : 'Start AI Marking'}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="results" className="p-4 sm:p-6 mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-2">Marking Results</h3>
                        <p className="text-sm text-muted-foreground">
                          AI analysis and feedback for the student work
                        </p>
                      </div>
                      <Button 
                        onClick={() => {
                          console.log('Start New clicked - resetting all state');
                          setMarkingResults(null);
                          setOcrText('');
                          setMarkingScheme('');
                          setSelectedFiles([]);
                          setActiveTab('upload');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Start New
                      </Button>
                    </div>
                    
                    <div className="min-h-[200px]">
                      {(() => {
                        console.log('Results tab rendering - markingResults:', !!markingResults);
                        return null;
                      })()}
                      {markingResults ? (
                        <div>
                          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                            <p className="text-sm text-success font-medium">
                              ✓ Marking Complete: {markingResults.results?.length || 0} question(s) processed
                            </p>
                            <p className="text-xs text-success/80 mt-1">
                              Score: {markingResults.totalMarks || 0}/{markingResults.maxTotalMarks || 0}
                            </p>
                          </div>
                          {(() => {
                            console.log('About to render MarkingResults component');
                            return null;
                          })()}
                          <MarkingResults
                            results={markingResults.results || []}
                            ocrText={ocrText}
                            totalMarks={markingResults.totalMarks || 0}
                            maxTotalMarks={markingResults.maxTotalMarks || 0}
                            overallFeedback={markingResults.overallFeedback || ''}
                          />
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground">No marking results available yet.</p>
                          <p className="text-sm text-muted-foreground mt-1">Complete the marking process to see results here.</p>
                          <div className="text-xs text-muted-foreground mt-2 opacity-50">
                            Current tab: {activeTab} | Processing: {isProcessing ? 'Yes' : 'No'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Help & Info Section */}
          <Card className="shadow-soft border-primary/20">
            <CardContent className="p-0">
              <Tabs defaultValue="how-it-works" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none rounded-t-lg h-10 sm:h-12">
                  <TabsTrigger value="how-it-works" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">How It Works</span>
                    <span className="sm:hidden">Help</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Security</span>
                    <span className="sm:hidden">Sec</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="how-it-works" className="p-4 sm:p-6 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
                
                <TabsContent value="security" className="p-4 sm:p-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Security & Compliance</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
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
        </div>
        
        {/* Footer */}
        <footer className="mt-12 sm:mt-16 border-t pt-6 sm:pt-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
              <span className="text-xs sm:text-sm text-muted-foreground">Proudly made by:</span>
              <a 
                href="https://clarence.guru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img 
                  src={clarenceLogo} 
                  alt="Clarence.guru" 
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover shadow-md"
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