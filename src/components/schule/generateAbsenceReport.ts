import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AbsenceData {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  description?: string | null;
  isDoublePeriod?: boolean;
  periodStart?: number;
  periodEnd?: number;
  timetable_entries?: {
    period: number;
    teacher_short: string;
    subjects: { name: string; short_name: string | null } | null;
  } | null;
}

interface AbsenceStats {
  total: number;
  totalDays: string;
  sickCount: number;
  sickDays: string;
  doctorCount: number;
  doctorDays: string;
  schoolProjectCount: number;
  schoolProjectDays: string;
  otherCount: number;
  otherDays: string;
  excused: number;
  excusedDays: string;
  unexcused: number;
  unexcusedDays: string;
  efaCount?: number;
  efaDays?: string;
}

const REASON_LABELS: Record<string, string> = {
  sick: 'Krank',
  doctor: 'Arzt',
  school_project: 'Schulprojekt',
  efa: 'EVA (Freistunde)',
  other: 'Sonstiges',
};

const REASON_COLORS: Record<string, { r: number; g: number; b: number }> = {
  sick: { r: 239, g: 68, b: 68 },
  doctor: { r: 59, g: 130, b: 246 },
  school_project: { r: 234, g: 179, b: 8 },
  efa: { r: 6, g: 182, b: 212 },
  other: { r: 107, g: 114, b: 128 },
};

export function generateAbsenceReport(absences: AbsenceData[], stats: AbsenceStats, userName?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add page break if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // stats.total already excludes EVA, so we use it directly
  const realAbsenceHours = stats.total;
  const realAbsenceDays = stats.totalDays;

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Fehlzeiten-Bericht', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = format(new Date(), 'dd. MMMM yyyy', { locale: de });
  doc.text(`Erstellt am ${dateStr}`, margin, 35);
  
  if (userName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Schüler/in: ${userName}`, margin, 42);
  }

  yPos = 60;

  // Statistics Overview Section
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Übersicht', margin, yPos);
  yPos += 10;

  // Draw statistics boxes
  const boxWidth = (pageWidth - 2 * margin - 15) / 4;
  const boxHeight = 35;
  
  // Total hours box (excluding EFA)
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(realAbsenceHours.toString(), margin + boxWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Fehlstunden', margin + boxWidth / 2, yPos + 23, { align: 'center' });
  doc.text(`(${realAbsenceDays} Tage)`, margin + boxWidth / 2, yPos + 30, { align: 'center' });

  // Excused box
  const excusedX = margin + boxWidth + 5;
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(excusedX, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(stats.excused.toString(), excusedX + boxWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Entschuldigt', excusedX + boxWidth / 2, yPos + 23, { align: 'center' });
  doc.setTextColor(100, 100, 100);
  doc.text(`(${stats.excusedDays} Tage)`, excusedX + boxWidth / 2, yPos + 30, { align: 'center' });

  // Unexcused box
  const unexcusedX = margin + 2 * (boxWidth + 5);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(unexcusedX, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text(stats.unexcused.toString(), unexcusedX + boxWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Offen', unexcusedX + boxWidth / 2, yPos + 23, { align: 'center' });
  doc.setTextColor(100, 100, 100);
  doc.text(`(${stats.unexcusedDays} Tage)`, unexcusedX + boxWidth / 2, yPos + 30, { align: 'center' });

  // EFA hours box (not counted as absence)
  const efaX = margin + 3 * (boxWidth + 5);
  doc.setFillColor(207, 250, 254);
  doc.roundedRect(efaX, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 182, 212);
  doc.text((stats.efaCount || 0).toString(), efaX + boxWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('EVA-Stunden', efaX + boxWidth / 2, yPos + 23, { align: 'center' });
  doc.setTextColor(100, 100, 100);
  doc.text('(keine Fehlzeit)', efaX + boxWidth / 2, yPos + 30, { align: 'center' });

  yPos += boxHeight + 15;

  // Reason Breakdown Section with Bar Chart
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Aufschlüsselung nach Grund', margin, yPos);
  yPos += 10;

  const reasonData = [
    { reason: 'sick', count: stats.sickCount, days: stats.sickDays, label: 'Krank' },
    { reason: 'doctor', count: stats.doctorCount, days: stats.doctorDays, label: 'Arzt' },
    { reason: 'school_project', count: stats.schoolProjectCount, days: stats.schoolProjectDays, label: 'Schulprojekt' },
    { reason: 'other', count: stats.otherCount, days: stats.otherDays, label: 'Sonstiges' },
  ];

  const maxCount = Math.max(...reasonData.map(r => r.count), 1);
  const barMaxWidth = pageWidth - 2 * margin - 80;
  const barHeight = 12;

  reasonData.forEach((item) => {
    const color = REASON_COLORS[item.reason];
    
    // Label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, margin, yPos + 8);
    
    // Bar background
    const barX = margin + 55;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(barX, yPos, barMaxWidth, barHeight, 2, 2, 'F');
    
    // Bar fill
    if (item.count > 0) {
      const barWidth = (item.count / maxCount) * barMaxWidth;
      doc.setFillColor(color.r, color.g, color.b);
      doc.roundedRect(barX, yPos, barWidth, barHeight, 2, 2, 'F');
    }
    
    // Count label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(`${item.count} Std (${item.days}T)`, barX + barMaxWidth + 3, yPos + 8);
    
    yPos += barHeight + 5;
  });

  yPos += 15;

  // Detailed List Section - Sorted by Subject
  checkPageBreak(30);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detaillierte Auflistung (nach Fach)', margin, yPos);
  yPos += 8;

  // Filter out EVA from detailed list if needed and sort by subject
  const nonEfaAbsences = absences.filter(a => a.reason !== 'efa');
  
  // Sort by subject name, then by date
  const sortedAbsences = [...nonEfaAbsences].sort((a, b) => {
    const subjectA = a.timetable_entries?.subjects?.name || a.timetable_entries?.teacher_short || 'ZZZ';
    const subjectB = b.timetable_entries?.subjects?.name || b.timetable_entries?.teacher_short || 'ZZZ';
    
    if (subjectA !== subjectB) {
      return subjectA.localeCompare(subjectB, 'de');
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (sortedAbsences.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Keine Fehlzeiten eingetragen.', margin, yPos + 10);
  } else {
    // Table header
    const colWidths = [50, 35, 35, 35, 15];
    const headers = ['Fach', 'Datum', 'Grund', 'Stunde(n)', '✓'];
    
    checkPageBreak(20);
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    let xPos = margin + 3;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos + 7);
      xPos += colWidths[i];
    });
    
    yPos += 12;

    // Group by subject for visual separation
    let currentSubject = '';

    // Table rows
    sortedAbsences.forEach((absence, index) => {
      checkPageBreak(12);
      
      const subjectName = absence.timetable_entries?.subjects?.name || 
                          absence.timetable_entries?.teacher_short || '-';
      
      // Add subject header when subject changes
      if (subjectName !== currentSubject) {
        currentSubject = subjectName;
        checkPageBreak(20);
        doc.setFillColor(229, 231, 235);
        doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 10, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(subjectName, margin + 3, yPos + 5);
        yPos += 12;
      }
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 10, 'F');
      }
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      xPos = margin + 3;
      
      // Subject (short name)
      const shortName = absence.timetable_entries?.subjects?.short_name || 
                        absence.timetable_entries?.teacher_short || '-';
      doc.text(shortName.substring(0, 15), xPos, yPos + 5);
      xPos += colWidths[0];
      
      // Date
      doc.text(format(new Date(absence.date), 'dd.MM.yyyy'), xPos, yPos + 5);
      xPos += colWidths[1];
      
      // Reason with color indicator
      const reasonColor = REASON_COLORS[absence.reason];
      doc.setFillColor(reasonColor.r, reasonColor.g, reasonColor.b);
      doc.circle(xPos + 2, yPos + 4, 2, 'F');
      doc.text(REASON_LABELS[absence.reason] || absence.reason, xPos + 7, yPos + 5);
      xPos += colWidths[2];
      
      // Period(s) - show as double lesson if applicable
      let periodText: string;
      if (absence.isDoublePeriod && absence.periodStart && absence.periodEnd) {
        periodText = `${absence.periodStart}.-${absence.periodEnd}. Std`;
      } else {
        periodText = `${absence.timetable_entries?.period || absence.periodStart || '-'}. Std`;
      }
      doc.text(periodText, xPos, yPos + 5);
      xPos += colWidths[3];
      
      // Status
      if (absence.excused) {
        doc.setTextColor(22, 163, 74);
        doc.text('✓', xPos + 3, yPos + 5);
      } else {
        doc.setTextColor(234, 88, 12);
        doc.text('○', xPos + 3, yPos + 5);
      }
      
      yPos += 10;
    });
  }

  // Add EVA section at the end if there are any
  const efaAbsences = absences.filter(a => a.reason === 'efa');
  if (efaAbsences.length > 0) {
    yPos += 10;
    checkPageBreak(30);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 182, 212);
    doc.text('EVA-Stunden (keine Fehlzeiten)', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${efaAbsences.length} EFA-Stunden wurden nicht als Fehlzeit gezählt.`, margin, yPos);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Generiert am ${dateStr}`, margin, footerY);
  doc.text('Schulplaner - Fehlzeiten-Bericht', pageWidth - margin - 50, footerY);

  // Save the PDF
  const fileName = `Fehlzeiten-Bericht_${userName ? userName.replace(/\s+/g, '_') + '_' : ''}${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
