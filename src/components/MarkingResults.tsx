import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, CheckCircle, AlertTriangle, XCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlagiarismResult } from '@/services/plagiarismService';

interface MarkingResult {
  question: string;
  studentAnswer: string;
  correctAnswer?: string;
  maxMarks: number;
  awardedMarks: number;
  feedback: string;
  markingScheme?: string;
  strengths: string[];
  improvements: string[];
}

interface MarkingResultsProps {
  results: MarkingResult[];
  ocrText: string;
  totalMarks: number;
  maxTotalMarks: number;
  overallFeedback: string;
  plagiarismResult?: PlagiarismResult;
}

export const MarkingResults = ({
  results,
  ocrText,
  totalMarks,
  maxTotalMarks,
  overallFeedback,
  plagiarismResult
}: MarkingResultsProps) => {
  console.log('MarkingResults rendering with:', { 
    resultsCount: results?.length, 
    totalMarks, 
    maxTotalMarks, 
    hasOverallFeedback: !!overallFeedback 
  });

  // Add safety checks
  if (!results || !Array.isArray(results)) {
    console.error('Invalid results data:', results);
    return (
      <Card className="shadow-medium">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Error: Invalid marking results data</p>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    console.warn('No results to display');
    return (
      <Card className="shadow-medium">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No marking results available</p>
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.round((totalMarks / maxTotalMarks) * 100);
  
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 80) return { 
      grade: 'A', 
      color: 'success', 
      icon: CheckCircle,
      bgClass: 'bg-success/10',
      textClass: 'text-success'
    };
    if (percentage >= 70) return { 
      grade: 'B', 
      color: 'success', 
      icon: CheckCircle,
      bgClass: 'bg-success/10',
      textClass: 'text-success'
    };
    if (percentage >= 60) return { 
      grade: 'C', 
      color: 'warning', 
      icon: AlertTriangle,
      bgClass: 'bg-warning/10',
      textClass: 'text-warning'
    };
    if (percentage >= 50) return { 
      grade: 'D', 
      color: 'warning', 
      icon: AlertTriangle,
      bgClass: 'bg-warning/10',
      textClass: 'text-warning'
    };
    return { 
      grade: 'F', 
      color: 'destructive', 
      icon: XCircle,
      bgClass: 'bg-destructive/10',
      textClass: 'text-destructive'
    };
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

  const exportToPDF = () => {
    if (!plagiarismResult) {
      console.log('No plagiarism result available for PDF export');
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to check and add new page if needed
    const checkAddPage = (requiredSpace = 40) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Title and Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Plagiarism Section
    if (plagiarismResult) {
      checkAddPage(40);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Plagiarism Detection', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Overall Similarity: ${plagiarismResult.overallSimilarity}%`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Risk Level: ${plagiarismResult.isHighRisk ? 'High' : 'Low'}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Summary: ${plagiarismResult.summary}`, margin, yPosition);
      yPosition += lineHeight + 5;

      if (plagiarismResult.matches.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Detected Matches:', margin, yPosition);
        yPosition += lineHeight + 2;

        plagiarismResult.matches.forEach((match, idx) => {
          checkAddPage(25);
          doc.setFont('helvetica', 'normal');
          doc.text(`${idx + 1}. ${match.source} (${match.similarity}% match)`, margin + 5, yPosition);
          yPosition += lineHeight;
          const matchLines = doc.splitTextToSize(`   "${match.matchedText}"`, pageWidth - 2 * margin - 10);
          doc.setFont('helvetica', 'italic');
          doc.text(matchLines, margin + 10, yPosition);
          yPosition += matchLines.length * lineHeight + 5;
        });
      }
      yPosition += 10;
    }

    // Overall Score Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Score', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Score: ${totalMarks}/${maxTotalMarks} (${percentage}%)`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Grade: ${gradeInfo.grade}`, margin, yPosition);
    yPosition += 15;

    // Overall Feedback
    if (overallFeedback) {
      checkAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Feedback:', margin, yPosition);
      yPosition += lineHeight + 2;
      
      doc.setFont('helvetica', 'normal');
      const feedbackLines = doc.splitTextToSize(overallFeedback, pageWidth - 2 * margin);
      doc.text(feedbackLines, margin, yPosition);
      yPosition += feedbackLines.length * lineHeight + 15;
    }

    // Question Results
    results.forEach((result, index) => {
      // Estimate space needed for this question
      const estimatedSpace = 80; // Base space for headers and structure
      checkAddPage(estimatedSpace);

      // Question Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Question ${index + 1}`, margin, yPosition);
      doc.text(`${result.awardedMarks}/${result.maxMarks} marks`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 12;

      // Question Text
      if (result.question) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Question:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        const questionLines = doc.splitTextToSize(result.question, pageWidth - 2 * margin);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * lineHeight + 8;
      }

      // Student Answer
      checkAddPage(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Answer:', margin, yPosition);
      yPosition += lineHeight + 2;
      
      doc.setFont('helvetica', 'normal');
      const answerLines = doc.splitTextToSize(result.studentAnswer, pageWidth - 2 * margin);
      doc.text(answerLines, margin, yPosition);
      yPosition += answerLines.length * lineHeight + 8;

      // Correct Answer
      if (result.correctAnswer) {
        checkAddPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Correct Answer:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        const correctLines = doc.splitTextToSize(result.correctAnswer, pageWidth - 2 * margin);
        doc.text(correctLines, margin, yPosition);
        yPosition += correctLines.length * lineHeight + 8;
      }

      // Feedback
      if (result.feedback) {
        checkAddPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback & Marking Justification:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        const feedbackLines = doc.splitTextToSize(result.feedback, pageWidth - 2 * margin);
        doc.text(feedbackLines, margin, yPosition);
        yPosition += feedbackLines.length * lineHeight + 8;
      }

      // Marking Scheme
      if (result.markingScheme) {
        checkAddPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Marking Scheme:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        const schemeLines = doc.splitTextToSize(result.markingScheme, pageWidth - 2 * margin);
        doc.text(schemeLines, margin, yPosition);
        yPosition += schemeLines.length * lineHeight + 8;
      }

      // Strengths
      if (result.strengths.length > 0) {
        checkAddPage(15);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Strengths:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        result.strengths.forEach(strength => {
          checkAddPage(10);
          const strengthLines = doc.splitTextToSize(`• ${strength}`, pageWidth - 2 * margin - 10);
          doc.text(strengthLines, margin + 5, yPosition);
          yPosition += strengthLines.length * lineHeight + 2;
        });
        yPosition += 5;
      }

      // Areas for Improvement
      if (result.improvements.length > 0) {
        checkAddPage(15);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ Areas for Improvement:', margin, yPosition);
        yPosition += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        result.improvements.forEach(improvement => {
          checkAddPage(10);
          const improvementLines = doc.splitTextToSize(`• ${improvement}`, pageWidth - 2 * margin - 10);
          doc.text(improvementLines, margin + 5, yPosition);
          yPosition += improvementLines.length * lineHeight + 2;
        });
        yPosition += 5;
      }

      // Add separator line if not the last question
      if (index < results.length - 1) {
        checkAddPage(15);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;
      }
    });

    // Save the PDF
    doc.save(`student-assessment-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="shadow-medium">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${gradeInfo.bgClass}`}>
              <GradeIcon className={`w-8 h-8 ${gradeInfo.textClass}`} />
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
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={exportToPDF} className="w-full" variant="default">
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={exportResults} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
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
          {results.map((result, index) => {
            // Ensure all properties are safe to render
            const safeResult = {
              question: typeof result.question === 'string' ? result.question : 'Question ' + (index + 1),
              studentAnswer: typeof result.studentAnswer === 'string' ? result.studentAnswer : 'No answer provided',
              correctAnswer: typeof result.correctAnswer === 'string' ? result.correctAnswer : '',
              maxMarks: typeof result.maxMarks === 'number' ? result.maxMarks : 0,
              awardedMarks: typeof result.awardedMarks === 'number' ? result.awardedMarks : 0,
              feedback: typeof result.feedback === 'string' ? result.feedback : 'No feedback available',
              markingScheme: typeof result.markingScheme === 'string' ? result.markingScheme : '',
              strengths: Array.isArray(result.strengths) ? result.strengths.filter(s => typeof s === 'string') : [],
              improvements: Array.isArray(result.improvements) ? result.improvements.filter(s => typeof s === 'string') : []
            };

            return (
              <Card key={index} className="shadow-soft">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{safeResult.question}</CardTitle>
                    <Badge 
                      variant={safeResult.awardedMarks === safeResult.maxMarks ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {safeResult.awardedMarks}/{safeResult.maxMarks}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Student Answer</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">{safeResult.studentAnswer}</p>
                  </div>
                  
                  {safeResult.correctAnswer && (
                    <div>
                      <h4 className="font-medium mb-2 text-success">Correct Answer</h4>
                      <p className="text-sm bg-success/5 border border-success/20 p-3 rounded-lg">{safeResult.correctAnswer}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Feedback & Marking Justification</h4>
                    <p className="text-sm text-muted-foreground">{safeResult.feedback}</p>
                  </div>

                  {safeResult.markingScheme && (
                    <div>
                      <h4 className="font-medium mb-2">Marking Scheme</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg border-l-4 border-primary/30">{safeResult.markingScheme}</p>
                    </div>
                  )}

                  {(safeResult.strengths.length > 0 || safeResult.improvements.length > 0) && (
                    <>
                      <Separator />
                      <div className="grid md:grid-cols-2 gap-4">
                        {safeResult.strengths.length > 0 && (
                          <div>
                            <h4 className="font-medium text-success mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Strengths
                            </h4>
                            <ul className="text-sm space-y-1">
                              {safeResult.strengths.map((strength, i) => (
                                <li key={i} className="text-muted-foreground">• {strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {safeResult.improvements.length > 0 && (
                          <div>
                            <h4 className="font-medium text-warning mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Areas for Improvement
                            </h4>
                            <ul className="text-sm space-y-1">
                              {safeResult.improvements.map((improvement, i) => (
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
            );
          })}
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