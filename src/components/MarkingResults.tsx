import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface MarkingResult {
  question: string;
  studentAnswer: string;
  maxMarks: number;
  awardedMarks: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface MarkingResultsProps {
  results: MarkingResult[];
  ocrText: string;
  totalMarks: number;
  maxTotalMarks: number;
  overallFeedback: string;
}

export const MarkingResults = ({ 
  results, 
  ocrText, 
  totalMarks, 
  maxTotalMarks, 
  overallFeedback 
}: MarkingResultsProps) => {
  const percentage = Math.round((totalMarks / maxTotalMarks) * 100);
  
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 80) return { grade: 'A', color: 'success', icon: CheckCircle };
    if (percentage >= 70) return { grade: 'B', color: 'success', icon: CheckCircle };
    if (percentage >= 60) return { grade: 'C', color: 'warning', icon: AlertTriangle };
    if (percentage >= 50) return { grade: 'D', color: 'warning', icon: AlertTriangle };
    return { grade: 'F', color: 'destructive', icon: XCircle };
  };

  const gradeInfo = getGradeInfo(percentage);
  const GradeIcon = gradeInfo.icon;

  const exportResults = () => {
    const exportData = {
      totalMarks,
      maxTotalMarks,
      percentage,
      grade: gradeInfo.grade,
      overallFeedback,
      results,
      ocrText,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marking-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="shadow-medium">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-${gradeInfo.color}/10`}>
              <GradeIcon className={`w-8 h-8 text-${gradeInfo.color}`} />
            </div>
            <div>
              <CardTitle className="text-3xl">
                {totalMarks}/{maxTotalMarks}
              </CardTitle>
              <CardDescription>
                Grade: {gradeInfo.grade} ({percentage}%)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Overall Feedback</h3>
              <p className="text-muted-foreground">{overallFeedback}</p>
            </div>
            <Button onClick={exportResults} className="w-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="results">Question Results</TabsTrigger>
          <TabsTrigger value="ocr">Original Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className="shadow-soft">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{result.question}</CardTitle>
                  <Badge 
                    variant={result.awardedMarks === result.maxMarks ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {result.awardedMarks}/{result.maxMarks}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Student Answer</h4>
                  <p className="text-sm bg-muted p-3 rounded-lg">{result.studentAnswer}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Feedback</h4>
                  <p className="text-sm text-muted-foreground">{result.feedback}</p>
                </div>

                {(result.strengths.length > 0 || result.improvements.length > 0) && (
                  <>
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium text-success mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Strengths
                          </h4>
                          <ul className="text-sm space-y-1">
                            {result.strengths.map((strength, i) => (
                              <li key={i} className="text-muted-foreground">• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.improvements.length > 0 && (
                        <div>
                          <h4 className="font-medium text-warning mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Areas for Improvement
                          </h4>
                          <ul className="text-sm space-y-1">
                            {result.improvements.map((improvement, i) => (
                              <li key={i} className="text-muted-foreground">• {improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="ocr">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                OCR Extracted Text
              </CardTitle>
              <CardDescription>
                The original text extracted from the handwritten work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {ocrText}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};