import { StudentAssessment, BatchJob } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ExportService {
  exportToCSV(assessments: StudentAssessment[], batchJob: BatchJob): void {
    const headers = [
      'Student Name',
      'Score',
      'Max Score',
      'Percentage',
      'AI Detection Score',
      'Plagiarism Score',
      'Status',
      'Orientation Corrected',
      'Feedback Summary'
    ];

    const rows = assessments.map(assessment => [
      assessment.student_name,
      assessment.total_score?.toFixed(2) || 'N/A',
      assessment.max_score?.toFixed(2) || 'N/A',
      assessment.percentage?.toFixed(2) + '%' || 'N/A',
      assessment.ai_detection_score?.toFixed(2) || '0',
      assessment.plagiarism_score?.toFixed(2) || '0',
      assessment.status,
      assessment.orientation_corrected ? 'Yes' : 'No',
      this.extractFeedbackSummary(assessment.detailed_feedback || '')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${batchJob.name}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF(assessments: StudentAssessment[], batchJob: BatchJob): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(batchJob.name, 14, 20);

    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Students: ${assessments.length}`, 14, 34);

    const completedCount = assessments.filter(a => a.status === 'completed').length;
    doc.text(`Completed: ${completedCount}`, 14, 40);

    const tableData = assessments.map(assessment => [
      assessment.student_name,
      assessment.total_score?.toFixed(2) || 'N/A',
      assessment.max_score?.toFixed(2) || 'N/A',
      assessment.percentage?.toFixed(1) + '%' || 'N/A',
      assessment.status
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Score', 'Max Score', 'Percentage', 'Status']],
      body: tableData,
      startY: 48,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    doc.addPage();
    doc.setFontSize(16);
    doc.text('Detailed Results', 14, 20);

    let yPosition = 30;

    assessments.forEach((assessment, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${assessment.student_name}`, 14, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      doc.text(`Score: ${assessment.total_score?.toFixed(2) || 'N/A'} / ${assessment.max_score?.toFixed(2) || 'N/A'} (${assessment.percentage?.toFixed(1)}%)`, 14, yPosition);
      yPosition += 5;

      if (assessment.ai_detection_score && assessment.ai_detection_score > 50) {
        doc.text(`⚠ AI Detection Score: ${assessment.ai_detection_score.toFixed(1)}%`, 14, yPosition);
        yPosition += 5;
      }

      if (assessment.plagiarism_score && assessment.plagiarism_score > 30) {
        doc.text(`⚠ Plagiarism Score: ${assessment.plagiarism_score.toFixed(1)}%`, 14, yPosition);
        yPosition += 5;
      }

      if (assessment.detailed_feedback) {
        doc.setFontSize(9);
        const feedbackLines = doc.splitTextToSize(assessment.detailed_feedback, 180);
        const linesToShow = feedbackLines.slice(0, 5);
        doc.text(linesToShow, 14, yPosition);
        yPosition += linesToShow.length * 4;
      }

      yPosition += 8;
    });

    doc.save(`${batchJob.name}_detailed_report.pdf`);
  }

  private extractFeedbackSummary(feedback: string): string {
    const lines = feedback.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    const firstLine = lines[0];
    if (firstLine.length > 100) {
      return firstLine.substring(0, 97) + '...';
    }
    return firstLine;
  }
}
