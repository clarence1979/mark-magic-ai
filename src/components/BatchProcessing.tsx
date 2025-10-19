import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Upload, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { BatchProcessingService } from '../services/batchProcessingService';
import { ExportService } from '../services/exportService';
import { StudentAssessment, BatchJob } from '../lib/supabase';

interface BatchProcessingProps {
  batchJobId: string;
  markingSchemeContent: string;
  apiKey: string;
  onComplete?: () => void;
}

export function BatchProcessing({ batchJobId, markingSchemeContent, apiKey, onComplete }: BatchProcessingProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedAssessments, setCompletedAssessments] = useState<StudentAssessment[]>([]);
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleProcessBatch = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select student assessment files to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setTotalFiles(files.length);
    setCompletedAssessments([]);

    const service = new BatchProcessingService();

    try {
      await service.processBatch(batchJobId, files, {
        apiKey,
        markingSchemeContent,
        onProgress: (current, total) => {
          setProgress((current / total) * 100);
        },
        onStudentComplete: (assessment) => {
          setCompletedAssessments(prev => [...prev, assessment]);
        }
      });

      const jobData = await service.getBatchJob(batchJobId);
      if (jobData) {
        setBatchJob(jobData);
      }

      const assessments = await service.getStudentAssessments(batchJobId);
      setCompletedAssessments(assessments);

      toast({
        title: "Batch Complete",
        description: `Successfully processed ${files.length} student assessments`
      });

      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process batch",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!batchJob) {
      const service = new BatchProcessingService();
      const jobData = await service.getBatchJob(batchJobId);
      if (!jobData) return;
      setBatchJob(jobData);
    }

    const exportService = new ExportService();
    exportService.exportToCSV(completedAssessments, batchJob!);

    toast({
      title: "CSV Exported",
      description: "Results exported to CSV file"
    });
  };

  const handleExportPDF = async () => {
    if (!batchJob) {
      const service = new BatchProcessingService();
      const jobData = await service.getBatchJob(batchJobId);
      if (!jobData) return;
      setBatchJob(jobData);
    }

    const exportService = new ExportService();
    exportService.exportToPDF(completedAssessments, batchJob!);

    toast({
      title: "PDF Exported",
      description: "Detailed report exported to PDF"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Student Assessments</CardTitle>
        <CardDescription>
          Select all student assessment images to process with the marking scheme
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {files.length} file(s) selected
            </p>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing students...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {completedAssessments.length} of {totalFiles} completed
            </p>
          </div>
        )}

        {completedAssessments.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Completed Assessments:</h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {completedAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="text-sm p-2 rounded bg-secondary"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{assessment.student_name}</span>
                    <span className={assessment.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                      {assessment.status === 'completed'
                        ? `${assessment.total_score?.toFixed(1)}/${assessment.max_score?.toFixed(1)}`
                        : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleProcessBatch}
            disabled={isProcessing || files.length === 0}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Process Batch
              </>
            )}
          </Button>
        </div>

        {completedAssessments.length > 0 && !isProcessing && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="flex-1"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
