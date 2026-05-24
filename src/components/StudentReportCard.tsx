import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Download, CircleCheck as CheckCircle2, Circle as XCircle, TrendingUp, TriangleAlert as AlertTriangle } from 'lucide-react';
import { StudentAssessment, QuestionResult } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentReportCardProps {
  assessment: StudentAssessment;
  assessmentName: string;
}

export function StudentReportCard({ assessment, assessmentName }: StudentReportCardProps) {
  const [tab, setTab] = useState('questions');

  const questions: QuestionResult[] = assessment.question_results || [];
  const pct = assessment.percentage ?? 0;

  const getGradeInfo = (p: number) => {
    if (p >= 80) return { label: 'A', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' };
    if (p >= 70) return { label: 'B', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' };
    if (p >= 60) return { label: 'C', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' };
    if (p >= 50) return { label: 'D', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' };
    return { label: 'F', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' };
  };

  const grade = getGradeInfo(pct);

  const exportStudentPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const checkPage = (y: number, needed = 20): number => {
      if (y + needed > 275) { doc.addPage(); return 20; }
      return y;
    };

    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(assessmentName, margin, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student Report: ${assessment.student_name}`, margin, 26);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 34);
    doc.setTextColor(0, 0, 0);

    let y = 48;

    // Score summary box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentW, 24, 3, 3, 'FD');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`${assessment.total_score?.toFixed(0) ?? '?'} / ${assessment.max_score?.toFixed(0) ?? '?'}`, margin + 6, y + 15);
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`${pct.toFixed(1)}%  —  Grade ${grade.label}`, margin + 55, y + 10);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${questions.length} question${questions.length !== 1 ? 's' : ''}`, margin + 55, y + 18);
    doc.setTextColor(0, 0, 0);
    y += 32;

    // Overall feedback
    if (assessment.detailed_feedback) {
      y = checkPage(y, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Feedback', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const feedbackLines = doc.splitTextToSize(assessment.detailed_feedback, contentW);
      feedbackLines.forEach((line: string) => {
        y = checkPage(y, 6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 4;
    }

    // Integrity flags
    if ((assessment.ai_detection_score ?? 0) > 50 || (assessment.plagiarism_score ?? 0) > 30) {
      y = checkPage(y, 16);
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.text('Integrity Flags:', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      const flags: string[] = [];
      if ((assessment.ai_detection_score ?? 0) > 50) flags.push(`AI content ${assessment.ai_detection_score?.toFixed(0)}%`);
      if ((assessment.plagiarism_score ?? 0) > 30) flags.push(`Plagiarism ${assessment.plagiarism_score?.toFixed(0)}%`);
      doc.text(flags.join('  ·  '), margin + 32, y + 6);
      doc.setTextColor(0, 0, 0);
      y += 20;
    }

    // Per-question breakdown
    if (questions.length > 0) {
      y = checkPage(y, 14);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Question-by-Question Breakdown', margin, y);
      y += 8;

      questions.forEach((q, i) => {
        y = checkPage(y, 30);

        // Question header row
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, y, contentW, 10, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        const qLabel = `Q${i + 1}: ${q.question}`;
        const truncatedQ = qLabel.length > 80 ? qLabel.substring(0, 77) + '…' : qLabel;
        doc.text(truncatedQ, margin + 3, y + 7);
        // Score badge on right
        const scoreText = `${q.awardedMarks}/${q.maxMarks}`;
        const scoreColor = q.awardedMarks >= q.maxMarks * 0.7
          ? ([34, 197, 94] as [number, number, number])
          : q.awardedMarks >= q.maxMarks * 0.4
          ? ([245, 158, 11] as [number, number, number])
          : ([239, 68, 68] as [number, number, number]);
        doc.setFillColor(...scoreColor);
        doc.roundedRect(pageW - margin - 22, y + 2, 22, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(scoreText, pageW - margin - 11, y + 6.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 13;

        // Two-column table: Student Answer | Correct Answer
        autoTable(doc, {
          startY: y,
          head: [['Student Answer', 'Model Answer / Marking Criteria']],
          body: [[q.studentAnswer || '(no answer)', q.correctAnswer || q.markingScheme || '—']],
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: { 0: { cellWidth: contentW / 2 - 2 }, 1: { cellWidth: contentW / 2 - 2 } },
          theme: 'striped',
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Feedback
        if (q.feedback) {
          y = checkPage(y, 10);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('Feedback:', margin, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const fbLines = doc.splitTextToSize(q.feedback, contentW);
          fbLines.forEach((line: string) => {
            y = checkPage(y, 5);
            doc.text(line, margin, y);
            y += 4.5;
          });
        }

        // Strengths
        if (q.strengths?.length) {
          y = checkPage(y, 8);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(21, 128, 61);
          doc.text('Strengths:', margin, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          q.strengths.forEach(s => {
            y = checkPage(y, 5);
            doc.text(`• ${s}`, margin + 3, y);
            y += 4.5;
          });
        }

        // Improvements
        if (q.improvements?.length) {
          y = checkPage(y, 8);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(185, 28, 28);
          doc.text('How to improve:', margin, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(153, 27, 27);
          q.improvements.forEach(imp => {
            y = checkPage(y, 5);
            doc.text(`• ${imp}`, margin + 3, y);
            y += 4.5;
          });
          doc.setTextColor(0, 0, 0);
        }

        y += 6;
      });
    }

    // OCR text appendix
    if (assessment.ocr_text) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Appendix: Extracted Student Text', margin, 20);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const ocrLines = doc.splitTextToSize(assessment.ocr_text, contentW);
      let ay = 30;
      ocrLines.forEach((line: string) => {
        ay = checkPage(ay, 5);
        doc.text(line, margin, ay);
        ay += 4.5;
      });
    }

    const safeName = assessment.student_name.replace(/[^a-z0-9]/gi, '_');
    doc.save(`${safeName}_${assessmentName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Mini score summary */}
      <div className={`flex items-center gap-4 p-3 rounded-lg border ${grade.bg} ${grade.border}`}>
        <div className="text-center flex-shrink-0">
          <p className={`text-3xl font-bold ${grade.text}`}>{grade.label}</p>
          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{assessment.total_score?.toFixed(0)} / {assessment.max_score?.toFixed(0)} marks</span>
            {(assessment.ai_detection_score ?? 0) > 50 && (
              <span className="flex items-center gap-1 text-amber-600 text-xs">
                <AlertTriangle className="w-3 h-3" />AI: {assessment.ai_detection_score?.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${grade.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportStudentPDF} className="flex-shrink-0">
          <Download className="w-3 h-3 mr-1.5" />PDF
        </Button>
      </div>

      {/* Overall feedback */}
      {assessment.detailed_feedback && (
        <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 border">
          <p className="font-medium text-foreground mb-1">Overall Feedback</p>
          <p className="leading-relaxed">{assessment.detailed_feedback}</p>
        </div>
      )}

      {/* Tabs: Questions | OCR text */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="questions" className="text-xs">
            Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs">Extracted Text</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-3 space-y-3">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No per-question data available.</p>
          )}
          {questions.map((q, i) => {
            const qPct = q.maxMarks > 0 ? q.awardedMarks / q.maxMarks : 0;
            const full = qPct >= 1;
            const partial = qPct >= 0.5 && !full;
            return (
              <div key={i} className="border rounded-lg overflow-hidden">
                {/* Question header */}
                <div className="flex items-start justify-between gap-3 px-3 py-2 bg-slate-50 border-b">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-primary mr-1">Q{i + 1}.</span>{q.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {full
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : partial
                      ? <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className={`text-sm font-bold ${full ? 'text-emerald-700' : partial ? 'text-amber-700' : 'text-red-700'}`}>
                      {q.awardedMarks}/{q.maxMarks}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-3 space-y-3">
                  {/* Student answer vs model answer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded p-2 border">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Student Answer</p>
                      <p className="text-xs leading-relaxed">{q.studentAnswer || <em className="text-muted-foreground">No answer</em>}</p>
                    </div>
                    <div className="bg-emerald-50 rounded p-2 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">Model Answer / Criteria</p>
                      <p className="text-xs leading-relaxed">{q.correctAnswer || q.markingScheme || <em className="text-muted-foreground">—</em>}</p>
                    </div>
                  </div>

                  {/* Feedback */}
                  {q.feedback && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Feedback: </span>{q.feedback}
                    </div>
                  )}

                  {/* Strengths & improvements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3 h-3" />Strengths
                        </p>
                        <ul className="space-y-0.5">
                          {q.strengths.map((s, si) => (
                            <li key={si} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-emerald-500 flex-shrink-0">•</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {q.improvements?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3" />How to do better
                        </p>
                        <ul className="space-y-0.5">
                          {q.improvements.map((imp, ii) => (
                            <li key={ii} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-amber-500 flex-shrink-0">•</span>{imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="text" className="mt-3">
          <pre className="text-xs bg-muted/40 rounded-lg p-3 border whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed">
            {assessment.ocr_text || 'No extracted text available.'}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
