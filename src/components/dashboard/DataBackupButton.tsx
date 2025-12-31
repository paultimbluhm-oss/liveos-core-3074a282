import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export function DataBackupButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        subjectsRes,
        timetableRes,
        homeworkRes,
        gradesRes,
        projectsRes,
        schoolTasksRes,
        absencesRes,
        habitsRes,
        accountsRes,
        transactionsRes,
        investmentsRes,
        loansRes,
        recipesRes,
        ingredientsRes,
        stepsRes,
        checklistsRes,
        checklistItemsRes,
        checklistSectionsRes,
        recipientsRes,
        giftIdeasRes,
        contactsRes,
        ordersRes,
        activitiesRes,
        ideasRes,
        optimizationsRes,
        termsRes,
        technicalTermsRes,
        calendarsRes,
        eventsRes,
      ] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
        supabase.from('homework').select('*').eq('user_id', user.id),
        supabase.from('grades').select('*').eq('user_id', user.id),
        supabase.from('school_projects').select('*').eq('user_id', user.id),
        supabase.from('school_tasks').select('*').eq('user_id', user.id),
        supabase.from('absences').select('*').eq('user_id', user.id),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('investments').select('*').eq('user_id', user.id),
        supabase.from('loans').select('*').eq('user_id', user.id),
        supabase.from('recipes').select('*').eq('user_id', user.id),
        supabase.from('recipe_ingredients').select('*').eq('user_id', user.id),
        supabase.from('recipe_steps').select('*').eq('user_id', user.id),
        supabase.from('checklists').select('*').eq('user_id', user.id),
        supabase.from('checklist_items').select('*').eq('user_id', user.id),
        supabase.from('checklist_sections').select('*').eq('user_id', user.id),
        supabase.from('gift_recipients').select('*').eq('user_id', user.id),
        supabase.from('gift_ideas').select('*').eq('user_id', user.id),
        supabase.from('contacts').select('*').eq('user_id', user.id),
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('boredom_activities').select('*').eq('user_id', user.id),
        supabase.from('ideas').select('*').eq('user_id', user.id),
        supabase.from('optimizations').select('*').eq('user_id', user.id),
        supabase.from('terms').select('*').eq('user_id', user.id),
        supabase.from('technical_terms').select('*').eq('user_id', user.id),
        supabase.from('calendars').select('*').eq('user_id', user.id),
        supabase.from('calendar_events').select('*').eq('user_id', user.id),
      ]);

      const pdf = new jsPDF();
      let y = 20;
      const pageHeight = 280;
      const margin = 20;
      const lineHeight = 6;

      const addTitle = (title: string) => {
        if (y > pageHeight - 30) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, y);
        y += 10;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
      };

      const addLine = (text: string) => {
        if (y > pageHeight) {
          pdf.addPage();
          y = 20;
        }
        const lines = pdf.splitTextToSize(text, 170);
        lines.forEach((line: string) => {
          if (y > pageHeight) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        });
      };

      const addSpace = () => { y += 5; };

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LiveOS Daten-Backup', margin, y);
      y += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`, margin, y);
      y += 15;

      // SCHULE
      addTitle('SCHULE - Faecher');
      if (subjectsRes.data?.length) {
        subjectsRes.data.forEach(s => {
          addLine(`- ${s.name}${s.short_name ? ` (${s.short_name})` : ''} | Lehrer: ${s.teacher_short || '-'} | Raum: ${s.room || '-'} | Jahr: ${s.grade_year}`);
        });
      } else {
        addLine('Keine Faecher vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Stundenplan');
      const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
      if (timetableRes.data?.length) {
        const byDay = timetableRes.data.reduce((acc, e) => {
          if (!acc[e.day_of_week]) acc[e.day_of_week] = [];
          acc[e.day_of_week].push(e);
          return acc;
        }, {} as Record<number, typeof timetableRes.data>);
        
        Object.entries(byDay).forEach(([day, entries]) => {
          addLine(`${weekdays[parseInt(day) - 1]}:`);
          entries.sort((a, b) => a.period - b.period).forEach(e => {
            addLine(`  Stunde ${e.period}: ${e.is_free ? 'Frei' : e.subject_short || '-'} | ${e.room || '-'}`);
          });
        });
      } else {
        addLine('Kein Stundenplan vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Hausaufgaben');
      if (homeworkRes.data?.length) {
        homeworkRes.data.forEach(h => {
          const subject = subjectsRes.data?.find(s => s.id === h.subject_id);
          addLine(`- ${h.title} | Fach: ${subject?.name || '-'} | Faellig: ${h.due_date} | ${h.completed ? 'Erledigt' : 'Offen'}`);
        });
      } else {
        addLine('Keine Hausaufgaben vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Noten');
      if (gradesRes.data?.length) {
        gradesRes.data.forEach(g => {
          const subject = subjectsRes.data?.find(s => s.id === g.subject_id);
          addLine(`- ${subject?.name || '-'}: ${g.points} Punkte | Typ: ${g.grade_type} | ${g.date || '-'}`);
        });
      } else {
        addLine('Keine Noten vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Projekte');
      if (projectsRes.data?.length) {
        projectsRes.data.forEach(p => {
          addLine(`- ${p.title} | Status: ${p.status || '-'} | Deadline: ${p.deadline || p.due_date || '-'}`);
        });
      } else {
        addLine('Keine Projekte vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Aufgaben');
      if (schoolTasksRes.data?.length) {
        schoolTasksRes.data.forEach(t => {
          addLine(`- ${t.title} | Typ: ${t.task_type || '-'} | ${t.completed ? 'Erledigt' : 'Offen'}`);
        });
      } else {
        addLine('Keine Schulaufgaben vorhanden');
      }
      addSpace();

      addTitle('SCHULE - Fehltage');
      if (absencesRes.data?.length) {
        absencesRes.data.forEach(a => {
          addLine(`- ${a.date} | Stunden: ${a.periods?.join(', ') || 'Ganzer Tag'} | ${a.excused ? 'Entschuldigt' : 'Unentschuldigt'} | ${a.reason || '-'}`);
        });
      } else {
        addLine('Keine Fehltage vorhanden');
      }
      addSpace();

      // HABITS
      addTitle('HABITS');
      if (habitsRes.data?.length) {
        habitsRes.data.forEach(h => {
          addLine(`- ${h.name}${h.description ? `: ${h.description}` : ''} | ${h.is_active ? 'Aktiv' : 'Inaktiv'}`);
        });
      } else {
        addLine('Keine Habits vorhanden');
      }
      addSpace();

      // FINANZEN
      addTitle('FINANZEN - Konten');
      if (accountsRes.data?.length) {
        accountsRes.data.forEach(a => {
          addLine(`- ${a.name} | Typ: ${a.account_type} | Kontostand: ${a.balance?.toFixed(2) || '0.00'} EUR`);
        });
      } else {
        addLine('Keine Konten vorhanden');
      }
      addSpace();

      addTitle('FINANZEN - Transaktionen');
      if (transactionsRes.data?.length) {
        transactionsRes.data.slice(0, 50).forEach(t => {
          addLine(`- ${t.date}: ${t.description || '-'} | ${t.amount} EUR | ${t.transaction_type} | ${t.category || '-'}`);
        });
        if (transactionsRes.data.length > 50) {
          addLine(`... und ${transactionsRes.data.length - 50} weitere Transaktionen`);
        }
      } else {
        addLine('Keine Transaktionen vorhanden');
      }
      addSpace();

      addTitle('FINANZEN - Investments');
      if (investmentsRes.data?.length) {
        investmentsRes.data.forEach(i => {
          addLine(`- ${i.name} | Typ: ${i.investment_type} | Menge: ${i.quantity} | Kaufpreis: ${i.purchase_price} EUR`);
        });
      } else {
        addLine('Keine Investments vorhanden');
      }
      addSpace();

      addTitle('FINANZEN - Darlehen');
      if (loansRes.data?.length) {
        loansRes.data.forEach(l => {
          addLine(`- ${l.lender_name}: ${l.original_amount} EUR | Typ: ${l.loan_type || '-'} | ${l.is_paid ? 'Bezahlt' : `Rest: ${l.remaining_amount} EUR`}`);
        });
      } else {
        addLine('Keine Darlehen vorhanden');
      }
      addSpace();

      // REZEPTE
      addTitle('REZEPTE');
      if (recipesRes.data?.length) {
        recipesRes.data.forEach(r => {
          addLine(`${r.name} | Kategorie: ${r.category || '-'} | Portionen: ${r.servings || '-'}`);
          const ingr = ingredientsRes.data?.filter(i => i.recipe_id === r.id) || [];
          if (ingr.length) {
            addLine(`  Zutaten: ${ingr.map(i => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim()).join(', ')}`);
          }
          const steps = stepsRes.data?.filter(s => s.recipe_id === r.id).sort((a, b) => a.step_number - b.step_number) || [];
          if (steps.length) {
            steps.forEach(s => addLine(`  ${s.step_number}. ${s.instruction}`));
          }
          addSpace();
        });
      } else {
        addLine('Keine Rezepte vorhanden');
      }
      addSpace();

      // CHECKLISTEN
      addTitle('CHECKLISTEN');
      if (checklistsRes.data?.length) {
        checklistsRes.data.forEach(cl => {
          addLine(`${cl.name}:`);
          const sections = checklistSectionsRes.data?.filter(s => s.checklist_id === cl.id) || [];
          const items = checklistItemsRes.data?.filter(i => i.checklist_id === cl.id) || [];
          
          if (sections.length) {
            sections.forEach(sec => {
              addLine(`  [${sec.name}]`);
              items.filter(i => i.section_id === sec.id).forEach(i => {
                addLine(`    ${i.completed ? '[x]' : '[ ]'} ${i.content}`);
              });
            });
          }
          items.filter(i => !i.section_id).forEach(i => {
            addLine(`  ${i.completed ? '[x]' : '[ ]'} ${i.content}`);
          });
        });
      } else {
        addLine('Keine Checklisten vorhanden');
      }
      addSpace();

      // GESCHENKE
      addTitle('GESCHENKIDEEN');
      if (recipientsRes.data?.length) {
        recipientsRes.data.forEach(r => {
          addLine(`${r.name}:`);
          const ideas = giftIdeasRes.data?.filter(g => g.recipient_id === r.id) || [];
          if (ideas.length) {
            ideas.forEach(g => {
              addLine(`  - ${g.title}${g.price ? ` (${g.price} EUR)` : ''} | ${g.purchased ? 'Gekauft' : 'Offen'}`);
            });
          } else {
            addLine('  Keine Ideen');
          }
        });
      } else {
        addLine('Keine Geschenkempfaenger vorhanden');
      }
      addSpace();

      // BUSINESS
      addTitle('BUSINESS - Kontakte');
      if (contactsRes.data?.length) {
        contactsRes.data.forEach(c => {
          addLine(`- ${c.name} | Firma: ${c.company || '-'} | Position: ${c.position || '-'} | Tel: ${c.phone || '-'} | Email: ${c.email || '-'}`);
        });
      } else {
        addLine('Keine Kontakte vorhanden');
      }
      addSpace();

      addTitle('BUSINESS - Auftraege');
      if (ordersRes.data?.length) {
        ordersRes.data.forEach(o => {
          addLine(`- ${o.title} | Status: ${o.status || '-'} | Betrag: ${o.amount || '-'} EUR | Faellig: ${o.due_date || '-'}`);
        });
      } else {
        addLine('Keine Auftraege vorhanden');
      }
      addSpace();

      // AKTIVITAETEN
      addTitle('AKTIVITAETEN');
      if (activitiesRes.data?.length) {
        activitiesRes.data.forEach(a => {
          addLine(`- ${a.name} | Kategorie: ${a.category || '-'} | ${a.is_productive ? 'Produktiv' : 'Freizeit'}`);
        });
      } else {
        addLine('Keine Aktivitaeten vorhanden');
      }
      addSpace();

      // IDEEN
      addTitle('IDEEN');
      if (ideasRes.data?.length) {
        ideasRes.data.forEach(i => {
          addLine(`- ${i.title} | Kategorie: ${i.category || '-'} | Status: ${i.status || '-'}`);
        });
      } else {
        addLine('Keine Ideen vorhanden');
      }
      addSpace();

      // OPTIMIERUNGEN
      addTitle('OPTIMIERUNGEN');
      if (optimizationsRes.data?.length) {
        optimizationsRes.data.forEach(o => {
          addLine(`- ${o.title} | Ort: ${o.location || '-'} | Status: ${o.status || '-'}`);
        });
      } else {
        addLine('Keine Optimierungen vorhanden');
      }
      addSpace();

      // BEGRIFFE
      addTitle('BEGRIFFE');
      if (termsRes.data?.length) {
        termsRes.data.forEach(t => {
          addLine(`- ${t.term}: ${t.definition}`);
        });
      } else {
        addLine('Keine Begriffe vorhanden');
      }
      addSpace();

      addTitle('FACHBEGRIFFE');
      if (technicalTermsRes.data?.length) {
        technicalTermsRes.data.forEach(t => {
          addLine(`- ${t.term}: ${t.explanation}`);
        });
      } else {
        addLine('Keine Fachbegriffe vorhanden');
      }
      addSpace();

      // KALENDER
      addTitle('KALENDER');
      if (calendarsRes.data?.length) {
        calendarsRes.data.forEach(c => {
          addLine(`${c.name}:`);
          const calEvents = eventsRes.data?.filter(e => e.calendar_id === c.id) || [];
          if (calEvents.length) {
            calEvents.forEach(e => {
              addLine(`  - ${e.title} | ${new Date(e.start_time).toLocaleDateString('de-DE')}`);
            });
          }
        });
      } else {
        addLine('Keine Kalender vorhanden');
      }

      // Save PDF
      pdf.save(`LiveOS_Backup_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Backup erfolgreich erstellt');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Fehler beim Erstellen des Backups');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={loading}
      variant="outline"
      className="w-full"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Alle Daten sichern
    </Button>
  );
}
