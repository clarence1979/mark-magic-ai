import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Users, BookOpen, CircleCheck as CheckCircle2, Loader as Loader2, X, FileText, Download, FileSpreadsheet, ChevronDown, ChevronUp, TriangleAlert as AlertTriangle, GraduationCap, ChartBar as BarChart3, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabaseAdmin } from '../lib/supabase';
import { BatchProcessingService } from '../services/batchProcessingService';
import { MarkingSchemeService } from '../services/markingSchemeService';
import { ExportService } from '../services/exportService';
import { StudentAssessment, BatchJob, QuestionResult } from '../lib/supabase';
import { StudentReportCard } from './StudentReportCard';

type Step = 'setup' | 'marking' | 'results';

interface ClassroomMarkingProps {
  apiKey: string;
}

export function ClassroomMarking({ apiKey }: ClassroomMarkingProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schemeFileInputRef = useRef<HTMLInputElement>(null);

  // Setup state
  const [step, setStep] = useState<Step>('setup');
  const [assessmentName, setAssessmentName] = useState('');
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  const [schemeMode, setSchemeMode] = useState<'upload' | 'ai' | 'manual'>('upload');
  const [schemeFile, setSchemeFile] = useState<File | null>(null);
  const [schemeText, setSchemeText] = useState('');
  const [aiSchemePrompt, setAiSchemePrompt] = useState('');
  const [isGeneratingScheme, setIsGeneratingScheme] = useState(false);
  const [resolvedScheme, setResolvedScheme] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentStudent, setCurrentStudent] = useState('');
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const canMark =
    assessmentName.trim() &&
    studentFiles.length > 0 &&
    (schemeMode === 'upload' ? !!schemeFile : schemeMode === 'manual' ? !!schemeText.trim() : !!aiSchemePrompt.trim());

  const handleStudentFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      setStudentFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...incoming.filter(f => !names.has(f.name))];
      });
    }
    e.target.value = '';
  };

  const removeStudentFile = (name: string) => {
    setStudentFiles(prev => prev.filter(f => f.name !== name));
  };

  const handleSchemeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchemeFile(e.target.files?.[0] || null);
  };

  const resolveMarkingScheme = async (): Promise<string | null> => {
    if (schemeMode === 'manual') return schemeText.trim() || null;

    if (schemeMode === 'upload') {
      if (!schemeFile) return null;
      setIsGeneratingScheme(true);
      try {
        const service = new MarkingSchemeService(apiKey);
        const result = await service.parseMarkingScheme(schemeFile);
        if (!result.success || !result.content) throw new Error(result.error || 'Failed to parse scheme');
        return result.content;
      } finally {
        setIsGeneratingScheme(false);
      }
    }

    // AI generation
    if (!aiSchemePrompt.trim()) return null;
    setIsGeneratingScheme(true);
    try {
      const service = new MarkingSchemeService(apiKey);
      const result = await service.generateMarkingScheme(aiSchemePrompt);
      if (!result.success || !result.content) throw new Error(result.error || 'Failed to generate scheme');
      return result.content;
    } finally {
      setIsGeneratingScheme(false);
    }
  };

  const handleMarkAll = async () => {
    if (!canMark) return;

    let scheme = resolvedScheme;
    if (!scheme) {
      try {
        const generated = await resolveMarkingScheme();
        if (!generated) {
          toast({ title: 'Marking Scheme Required', description: 'Please provide a marking scheme.', variant: 'destructive' });
          return;
        }
        scheme = generated;
        setResolvedScheme(scheme);
      } catch (err) {
        toast({ title: 'Scheme Error', description: err instanceof Error ? err.message : 'Failed to prepare scheme', variant: 'destructive' });
        return;
      }
    }

    setStep('marking');
    setIsProcessing(true);
    setProcessedCount(0);
    setAssessments([]);

    try {
      // Persist marking scheme
      const { data: schemeData, error: schemeErr } = await supabaseAdmin
        .from('marking_schemes')
        .insert({
          name: assessmentName,
          content: scheme,
          file_type: schemeMode === 'ai' ? 'ai-generated' : schemeMode === 'upload' ? (schemeFile?.name.split('.').pop() || 'unknown') : 'manual',
          is_ai_generated: schemeMode === 'ai',
          original_filename: schemeFile?.name || '',
        })
        .select()
        .maybeSingle();

      if (schemeErr) throw schemeErr;
      if (!schemeData) throw new Error('Failed to save marking scheme');

      const { data: jobData, error: jobErr } = await supabaseAdmin
        .from('batch_jobs')
        .insert({
          name: assessmentName,
          marking_scheme_id: schemeData.id,
          status: 'pending',
          total_students: studentFiles.length,
          processed_students: 0,
        })
        .select()
        .maybeSingle();

      if (jobErr) throw jobErr;
      if (!jobData) throw new Error('Failed to create batch job');

      setBatchJob(jobData as BatchJob);

      const service = new BatchProcessingService();

      await service.processBatch(jobData.id, studentFiles, {
        apiKey,
        markingSchemeContent: scheme,
        onProgress: (current, total) => {
          setProcessedCount(current);
        },
        onStudentComplete: (assessment) => {
          setCurrentStudent(assessment.student_name);
          setAssessments(prev => {
            const existing = prev.findIndex(a => a.id === assessment.id);
            if (existing >= 0) {
              const copy = [...prev];
              copy[existing] = assessment;
              return copy;
            }
            return [...prev, assessment];
          });
        },
      });

      // Final fetch to get all (with question_results from DB)
      const finalAssessments = await service.getStudentAssessments(jobData.id);
      const finalJob = await service.getBatchJob(jobData.id);
      setAssessments(finalAssessments);
      if (finalJob) setBatchJob(finalJob as BatchJob);

      setStep('results');
      toast({ title: 'Marking Complete', description: `${finalAssessments.filter(a => a.status === 'completed').length} students marked.` });
    } catch (err) {
      toast({ title: 'Processing Error', description: err instanceof Error ? err.message : 'Failed to process', variant: 'destructive' });
      setStep('setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('setup');
    setAssessmentName('');
    setStudentFiles([]);
    setSchemeFile(null);
    setSchemeText('');
    setAiSchemePrompt('');
    setResolvedScheme('');
    setAssessments([]);
    setBatchJob(null);
    setProcessedCount(0);
    setCurrentStudent('');
    setExpandedStudent(null);
  };

  const handleExportCSV = () => {
    if (!batchJob) return;
    new ExportService().exportToCSV(assessments, batchJob);
    toast({ title: 'CSV Exported' });
  };

  const handleExportPDF = () => {
    if (!batchJob) return;
    new ExportService().exportToPDF(assessments, batchJob);
    toast({ title: 'Class Report Exported' });
  };

  const completedAssessments = assessments.filter(a => a.status === 'completed');
  const classAverage = completedAssessments.length > 0
    ? completedAssessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAssessments.length
    : null;

  const getGrade = (pct: number) => {
    if (pct >= 80) return { label: 'A', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (pct >= 70) return { label: 'B', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (pct >= 60) return { label: 'C', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (pct >= 50) return { label: 'D', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'F', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  // ─── Setup screen ──────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="space-y-6">
        {/* Assessment name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="w-4 h-4 text-primary" />
              Assessment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="assessmentName">Assessment Name</Label>
              <Input
                id="assessmentName"
                placeholder="e.g. Year 10 Maths — Chapter 4 Test"
                value={assessmentName}
                onChange={e => setAssessmentName(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Student files */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" />
              Student Assessments
              {studentFiles.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{studentFiles.length} file{studentFiles.length !== 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Upload one file per student. Name each file after the student (e.g. <em>Jane Smith.pdf</em>).
              Accepts images, PDF, DOCX, and text files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to add student files</p>
              <p className="text-xs text-muted-foreground mt-1">You can add files in multiple batches</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.md"
                className="hidden"
                onChange={handleStudentFilesChange}
              />
            </div>

            {studentFiles.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {studentFiles.map(f => (
                  <div key={f.name} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="truncate font-medium">{new BatchProcessingService().extractStudentName(f.name)}</span>
                      <span className="text-muted-foreground flex-shrink-0 text-xs">({f.name})</span>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-6 w-6" onClick={() => removeStudentFile(f.name)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Marking scheme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-primary" />
              Marking Scheme
            </CardTitle>
            <CardDescription>
              One scheme is applied fairly and consistently to every student in this assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {(['upload', 'ai', 'manual'] as const).map(mode => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={schemeMode === mode ? 'default' : 'outline'}
                  onClick={() => setSchemeMode(mode)}
                >
                  {mode === 'upload' ? 'Upload File' : mode === 'ai' ? (
                    <><Sparkles className="w-3 h-3 mr-1" />AI Generate</>
                  ) : 'Type Manually'}
                </Button>
              ))}
            </div>

            {schemeMode === 'upload' && (
              <div>
                <div className="flex items-center gap-2">
                  <Input
                    ref={schemeFileInputRef as any}
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.md"
                    onChange={handleSchemeFileChange}
                  />
                  {schemeFile && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSchemeFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, or image of your marking rubric</p>
              </div>
            )}

            {schemeMode === 'ai' && (
              <div>
                <Label htmlFor="aiPrompt">Describe the Assessment</Label>
                <Textarea
                  id="aiPrompt"
                  placeholder="e.g. Year 10 essay on climate change. 20 marks total: introduction (4), arguments (8), evidence (4), conclusion (4)."
                  value={aiSchemePrompt}
                  onChange={e => setAiSchemePrompt(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">AI will generate a standardised rubric before marking begins.</p>
              </div>
            )}

            {schemeMode === 'manual' && (
              <div>
                <Label htmlFor="schemeText">Marking Scheme</Label>
                <Textarea
                  id="schemeText"
                  placeholder="Enter your marking criteria here..."
                  value={schemeText}
                  onChange={e => setSchemeText(e.target.value)}
                  rows={8}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!canMark || isGeneratingScheme}
          onClick={handleMarkAll}
        >
          {isGeneratingScheme ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Preparing Scheme...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5 mr-2" />Mark All {studentFiles.length > 0 ? `${studentFiles.length} Student${studentFiles.length !== 1 ? 's' : ''}` : 'Students'}</>
          )}
        </Button>
      </div>
    );
  }

  // ─── Marking in progress ───────────────────────────────────────────────────
  if (step === 'marking') {
    const pct = studentFiles.length > 0 ? (processedCount / studentFiles.length) * 100 : 0;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Marking in Progress
            </CardTitle>
            <CardDescription>
              Applying the same marking scheme to every student. Please do not close this tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm font-medium">
                <span>{processedCount} / {studentFiles.length} students</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} className="h-3" />
            </div>
            {currentStudent && (
              <p className="text-sm text-muted-foreground">
                Currently marking: <span className="font-medium text-foreground">{currentStudent}</span>
              </p>
            )}
            {assessments.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {assessments.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm">
                    <span className="font-medium">{a.student_name}</span>
                    {a.status === 'completed' ? (
                      <span className="text-emerald-600 font-medium">{a.total_score?.toFixed(0)}/{a.max_score?.toFixed(0)} ({a.percentage?.toFixed(0)}%)</span>
                    ) : a.status === 'failed' ? (
                      <span className="text-red-500">Failed</span>
                    ) : (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Results ───────────────────────────────────────────────────────────────
  const failed = assessments.filter(a => a.status === 'failed');
  const gradeDistribution = completedAssessments.reduce((acc, a) => {
    const g = getGrade(a.percentage || 0).label;
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Class summary header */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold">{assessmentName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedAssessments.length} of {assessments.length} students marked
                {failed.length > 0 && ` · ${failed.length} failed`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-1.5" />Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                New Assessment
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{completedAssessments.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Students Marked</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {classAverage !== null ? `${classAverage.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Class Average</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {completedAssessments.length > 0
                  ? `${Math.max(...completedAssessments.map(a => a.percentage || 0)).toFixed(0)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Highest Score</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {completedAssessments.length > 0
                  ? `${Math.min(...completedAssessments.map(a => a.percentage || 0)).toFixed(0)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Lowest Score</p>
            </div>
          </div>

          {/* Grade distribution */}
          {Object.keys(gradeDistribution).length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Grade distribution:</span>
              {['A', 'B', 'C', 'D', 'F'].map(g => gradeDistribution[g] ? (
                <Badge key={g} variant="outline" className={`text-xs ${getGrade(g === 'A' ? 85 : g === 'B' ? 75 : g === 'C' ? 65 : g === 'D' ? 55 : 40).color}`}>
                  {g}: {gradeDistribution[g]}
                </Badge>
              ) : null)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Individual Results</h3>
        {assessments
          .slice()
          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
          .map(assessment => {
            const isExpanded = expandedStudent === assessment.id;
            const grade = assessment.percentage != null ? getGrade(assessment.percentage) : null;

            return (
              <Card key={assessment.id} className="overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedStudent(isExpanded ? null : assessment.id)}
                >
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{assessment.student_name}</p>
                      <p className="text-xs text-muted-foreground">{assessment.file_name}</p>
                    </div>
                    {assessment.status === 'completed' && grade ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-medium">
                          {assessment.total_score?.toFixed(0)}/{assessment.max_score?.toFixed(0)}
                        </span>
                        <Badge variant="outline" className={`text-xs font-bold ${grade.color}`}>
                          {grade.label} · {assessment.percentage?.toFixed(0)}%
                        </Badge>
                        {assessment.ai_detection_score && assessment.ai_detection_score > 50 && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" title="High AI detection score" />
                        )}
                      </div>
                    ) : assessment.status === 'failed' ? (
                      <Badge variant="destructive" className="text-xs flex-shrink-0">Failed</Badge>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>

                {isExpanded && assessment.status === 'completed' && (
                  <div className="border-t px-4 py-4">
                    <StudentReportCard assessment={assessment} assessmentName={assessmentName} />
                  </div>
                )}

                {isExpanded && assessment.status === 'failed' && (
                  <div className="border-t px-4 py-4">
                    <p className="text-sm text-red-600">
                      {assessment.error_message || 'Processing failed for this student.'}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
