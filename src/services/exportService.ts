import { StudentAssessment, BatchJob, QuestionResult } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ExportService {
  exportToCSV(assessments: StudentAssessment[], batchJob: BatchJob): void {
    const headers = [
      'Student Name',
      'Score',
      'Max Score',
      'Percentage',
      'Grade',
      'AI Detection Score',
      'Plagiarism Score',
      'Status',
      'Overall Feedback',
    ];

    const rows = assessments.map(a => [
      a.student_name,
      a.total_score?.toFixed(2) ?? 'N/A',
      a.max_score?.toFixed(2) ?? 'N/A',
      a.percentage != null ? a.percentage.toFixed(2) + '%' : 'N/A',
      a.percentage != null ? this.grade(a.percentage) : 'N/A',
      a.ai_detection_score?.toFixed(2) ?? '0',
      a.plagiarism_score?.toFixed(2) ?? '0',
      a.status,
      this.extractFeedbackSummary(a.detailed_feedback || ''),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    this.downloadBlob(
      new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
      `${batchJob.name}_results.csv`
    );
  }

  exportToPDF(assessments: StudentAssessment[], batchJob: BatchJob): void {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const checkPage = (y: number, needed = 20): number => {
      if (y + needed > 275) { doc.addPage(); return 20; }
      return y;
    };

    // ── Cover page ─────────────────────────────────────────────────────────
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(batchJob.name, margin, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Class Assessment Report', margin, 28);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 38);
    doc.setTextColor(0, 0, 0);

    let y = 55;

    // Class stats
    const completed = assessments.filter(a => a.status === 'completed');
    const avg = completed.length > 0
      ? completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length
      : null;
    const high = completed.length > 0 ? Math.max(...completed.map(a => a.percentage ?? 0)) : null;
    const low = completed.length > 0 ? Math.min(...completed.map(a => a.percentage ?? 0)) : null;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Summary', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const stats = [
      ['Total Students', String(assessments.length)],
      ['Marked', String(completed.length)],
      ['Class Average', avg != null ? `${avg.toFixed(1)}%` : '—'],
      ['Highest Score', high != null ? `${high.toFixed(1)}%` : '—'],
      ['Lowest Score', low != null ? `${low.toFixed(1)}%` : '—'],
    ];
    stats.forEach(([label, value]) => {
      doc.setTextColor(100, 116, 139);
      doc.text(label + ':', margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(value, margin + 38, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
    });
    y += 4;

    // Summary table
    const tableRows = assessments
      .slice()
      .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
      .map(a => [
        a.student_name,
        a.status === 'completed' ? `${a.total_score?.toFixed(0) ?? '?'}/${a.max_score?.toFixed(0) ?? '?'}` : '—',
        a.percentage != null ? `${a.percentage.toFixed(1)}%` : '—',
        a.percentage != null ? this.grade(a.percentage) : '—',
        a.status,
      ]);

    autoTable(doc, {
      head: [['Student Name', 'Score', 'Percentage', 'Grade', 'Status']],
      body: tableRows,
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const g = String(data.cell.raw);
          const color: [number, number, number] =
            g === 'A' ? [21, 128, 61] :
            g === 'B' ? [29, 78, 216] :
            g === 'C' ? [180, 83, 9] :
            g === 'D' ? [194, 65, 12] :
            [185, 28, 28];
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Individual student pages ────────────────────────────────────────────
    assessments
      .slice()
      .sort((a, b) => a.student_name.localeCompare(b.student_name))
      .forEach(assessment => {
        doc.addPage();
        y = 14;

        // Student header bar
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, y, contentW, 18, 3, 3, 'FD');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(assessment.student_name, margin + 4, y + 12);
        if (assessment.status === 'completed') {
          const scoreStr = `${assessment.total_score?.toFixed(0) ?? '?'}/${assessment.max_score?.toFixed(0) ?? '?'}  (${(assessment.percentage ?? 0).toFixed(1)}%)  Grade ${this.grade(assessment.percentage ?? 0)}`;
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          doc.text(scoreStr, pageW - margin - 4, y + 12, { align: 'right' });
        }
        doc.setTextColor(0, 0, 0);
        y += 24;

        if (assessment.status !== 'completed') {
          doc.setFontSize(9);
          doc.setTextColor(185, 28, 28);
          doc.text(`Status: ${assessment.status}. ${assessment.error_message ?? ''}`, margin, y);
          return;
        }

        // Overall feedback
        if (assessment.detailed_feedback) {
          y = checkPage(y, 14);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('Overall Feedback:', margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const fbLines = doc.splitTextToSize(assessment.detailed_feedback, contentW);
          fbLines.slice(0, 6).forEach((line: string) => {
            y = checkPage(y, 5);
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 4;
        }

        // Per-question table
        const questions: QuestionResult[] = assessment.question_results || [];
        if (questions.length > 0) {
          y = checkPage(y, 14);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Question Results', margin, y);
          y += 5;

          autoTable(doc, {
            head: [['#', 'Question', 'Student Answer', 'Marks']],
            body: questions.map((q, i) => [
              `Q${i + 1}`,
              q.question?.substring(0, 60) + (q.question?.length > 60 ? '…' : ''),
              q.studentAnswer?.substring(0, 60) + (q.studentAnswer?.length > 60 ? '…' : ''),
              `${q.awardedMarks}/${q.maxMarks}`,
            ]),
            startY: y,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2.5 },
            headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: contentW * 0.35 },
              2: { cellWidth: contentW * 0.45 },
              3: { cellWidth: 18 },
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          });
          y = (doc as any).lastAutoTable.finalY + 6;

          // Detailed per-question feedback
          questions.forEach((q, i) => {
            if (!q.feedback && !q.improvements?.length && !q.strengths?.length) return;
            y = checkPage(y, 18);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(`Q${i + 1} Feedback (${q.awardedMarks}/${q.maxMarks}):`, margin, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);

            if (q.feedback) {
              const lines = doc.splitTextToSize(q.feedback, contentW);
              lines.slice(0, 3).forEach((line: string) => {
                y = checkPage(y, 4);
                doc.text(line, margin + 3, y);
                y += 4;
              });
            }

            if (q.improvements?.length) {
              y = checkPage(y, 5);
              doc.setTextColor(153, 27, 27);
              doc.text('Improve: ' + q.improvements.slice(0, 2).join(' · '), margin + 3, y);
              y += 4.5;
            }

            doc.setTextColor(0, 0, 0);
          });
        }
      });

    doc.save(`${batchJob.name.replace(/[^a-z0-9]/gi, '_')}_class_report.pdf`);
  }

  private grade(pct: number): string {
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  private extractFeedbackSummary(feedback: string): string {
    const lines = feedback.split('\n').filter(l => l.trim());
    if (!lines.length) return '';
    const first = lines[0];
    return first.length > 100 ? first.substring(0, 97) + '...' : first;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
