import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FileEntry, Loop, SecondaryAnnotation } from '../../../shared/types';
import { MORPHOLOGY_COLORS, SECONDARY_COLORS } from '../../../shared/constants';
import { saveFile } from '../../../shared/utils/fileSaver';
import { parseFinger, type StandardFinger } from '../../../shared/utils/fingerParsing';
import { renderAnnotatedImage } from '../../annotation/utils/canvasRenderer';

// Internal stats types for PDF generation
type MorphologyStats = Record<Loop['morphology'], number>;
type SecondaryStats = Record<SecondaryAnnotation['type'], number>;

// Helper interface for processed files
interface ProcessedFile {
    file: FileEntry;
    originalName: string;
    displayName: string;
    finger: StandardFinger | 'Unknown';
}

export const generateBatchPDF = async (
    files: FileEntry[],
    patientId: string
): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 1. Filter annotated files
    const annotatedFiles = files.filter(f => f.annotations);

    if (annotatedFiles.length === 0) {
        alert('No annotated images found to export.');
        return;
    }

    // 2. Group and Rename Files
    const fingerGroups: Record<string, FileEntry[]> = {};
    const processedFiles: ProcessedFile[] = [];

    // First pass: Group by finger
    annotatedFiles.forEach(file => {
        const finger = parseFinger(file.filename) || 'Unknown';
        if (!fingerGroups[finger]) {
            fingerGroups[finger] = [];
        }
        fingerGroups[finger].push(file);
    });

    // Second pass: Assign names (A, B, C...)
    const sortOrder: Record<string, number> = {
        'R2': 1, 'R3': 2, 'R4': 3, 'R5': 4,
        'L2': 5, 'L3': 6, 'L4': 7, 'L5': 8,
        'Unknown': 99
    };

    const sortedFingers = Object.keys(fingerGroups).sort((a, b) => {
        return (sortOrder[a] || 99) - (sortOrder[b] || 99);
    });

    sortedFingers.forEach(finger => {
        const group = fingerGroups[finger];
        group.sort((a, b) => a.filename.localeCompare(b.filename));

        group.forEach((file, index) => {
            const suffix = String.fromCharCode(65 + index); // A, B, C...
            const displayName = finger !== 'Unknown' ? `${finger}-${suffix}` : file.filename;

            processedFiles.push({
                file,
                originalName: file.filename,
                displayName,
                finger: finger as StandardFinger | 'Unknown'
            });
        });
    });

    // 3. TITLE PAGE
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Capillaroscopy Analysis Report', pageWidth / 2, 60, { align: 'center' });

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Patient ID: ${patientId}`, pageWidth / 2, 80, { align: 'center' });

    const now = new Date();
    const isoDateTime = now.toISOString().replace('T', ' ').slice(0, 19);
    pdf.text(`Generated: ${isoDateTime}`, pageWidth / 2, 90, { align: 'center' });
    pdf.text(`Total Images: ${processedFiles.length} `, pageWidth / 2, 100, { align: 'center' });

    pdf.setFontSize(10);
    pdf.text('Nailfold Capillaroscopy Annotator v1.0', pageWidth / 2, pageHeight - 20, {
        align: 'center'
    });

    // 4. SUMMARY PAGE
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary Statistics', 14, 20);

    const tableData: any[][] = [];
    let grandTotal: MorphologyStats = { Normal: 0, Tortuous: 0, Enlarged: 0, Giant: 0, Ramified: 0, Bizarre: 0 };
    let grandTotalSecondary: SecondaryStats = { Hemorrhage: 0, Avascular: 0 };

    processedFiles.forEach((p) => {
        const file = p.file;
        if (!file.annotations) return;

        const stats: MorphologyStats = { Normal: 0, Tortuous: 0, Enlarged: 0, Giant: 0, Ramified: 0, Bizarre: 0 };
        const secStats: SecondaryStats = { Hemorrhage: 0, Avascular: 0 };

        file.annotations.loops.forEach((loop) => stats[loop.morphology]++);
        if (file.annotations.secondaries) {
            file.annotations.secondaries.forEach(s => secStats[s.type]++);
        }

        const totalLoops = Object.values(stats).reduce((sum, count) => sum + count, 0);

        tableData.push([
            p.displayName,
            stats.Normal, stats.Tortuous, stats.Enlarged, stats.Giant, stats.Ramified, stats.Bizarre,
            totalLoops, secStats.Hemorrhage, secStats.Avascular
        ]);

        Object.keys(grandTotal).forEach((key) => {
            grandTotal[key as keyof MorphologyStats] += stats[key as keyof MorphologyStats];
        });
        Object.keys(grandTotalSecondary).forEach((key) => {
            grandTotalSecondary[key as keyof SecondaryStats] += secStats[key as keyof SecondaryStats];
        });
    });

    const allTotalLoops = Object.values(grandTotal).reduce((sum, count) => sum + count, 0);
    tableData.push(['TOTAL', grandTotal.Normal, grandTotal.Tortuous, grandTotal.Enlarged, grandTotal.Giant, grandTotal.Ramified, grandTotal.Bizarre, allTotalLoops, grandTotalSecondary.Hemorrhage, grandTotalSecondary.Avascular]);

    const avg = (val: number) => (val / processedFiles.length).toFixed(3);
    tableData.push(['AVERAGE', avg(grandTotal.Normal), avg(grandTotal.Tortuous), avg(grandTotal.Enlarged), avg(grandTotal.Giant), avg(grandTotal.Ramified), avg(grandTotal.Bizarre), avg(allTotalLoops), avg(grandTotalSecondary.Hemorrhage), avg(grandTotalSecondary.Avascular)]);

    autoTable(pdf, {
        startY: 30,
        head: [['Image', 'Normal', 'Tortuous', 'Enlarged', 'Giant', 'Ramified', 'Bizarre', 'Loops', 'Hemo', 'Avasc']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { halign: 'center', cellWidth: 15 },
            2: { halign: 'center', cellWidth: 15 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'center', cellWidth: 15 },
            5: { halign: 'center', cellWidth: 15 },
            6: { halign: 'center', cellWidth: 15 },
            7: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
            8: { halign: 'center', cellWidth: 15, textColor: [153, 27, 27] },
            9: { halign: 'center', cellWidth: 15, textColor: [107, 114, 128] }
        },
        didParseCell: (data) => {
            if (data.row.index === tableData.length - 2 || data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [243, 244, 246];
            }
        }
    });

    // 5. ANNOTATED IMAGES
    for (const p of processedFiles) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(p.displayName, 14, 15);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100);
        pdf.text(`(${p.originalName})`, 14 + pdf.getTextWidth(p.displayName) + 5, 15);
        pdf.setTextColor(0);

        const imageData = await renderAnnotatedImage(p.file, { displayName: p.displayName });

        if (imageData) {
            const imgWidth = pageWidth - 28;
            const imgHeight = (imgWidth * imageData.height) / imageData.width;
            let finalHeight = imgHeight;
            let finalWidth = imgWidth;

            const maxImageHeight = pageHeight - 100; // Leave space for tables
            if (imgHeight > maxImageHeight) {
                finalHeight = maxImageHeight;
                finalWidth = (finalHeight * imageData.width) / imageData.height;
            }

            const xPos = (pageWidth - finalWidth) / 2;
            pdf.addImage(imageData.data, 'JPEG', xPos, 20, finalWidth, finalHeight);

            const legendStartY = 20 + finalHeight + 5;
            const legendData = [['', 'Normal', '', 'Ramified'], ['', 'Tortuous', '', 'Bizarre'], ['', 'Enlarged', '', 'Hemorrhage'], ['', 'Giant', '', 'Avascular']];

            autoTable(pdf, {
                startY: legendStartY,
                head: [['Marker', 'Type', 'Marker', 'Type']],
                body: legendData,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 2, minCellHeight: 6 },
                headStyles: { fontSize: 8, fontStyle: 'bold', textColor: [100, 100, 100] },
                columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 35 } },
                margin: { left: (pageWidth - 100) / 2 },
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const x = data.cell.x + data.cell.width / 2;
                        const y = data.cell.y + data.cell.height / 2;
                        const drawMarker = (type: string) => {
                            if (MORPHOLOGY_COLORS[type as keyof typeof MORPHOLOGY_COLORS]) {
                                pdf.setFillColor(MORPHOLOGY_COLORS[type as keyof typeof MORPHOLOGY_COLORS]);
                                pdf.setDrawColor(0, 0, 0);
                                pdf.setLineWidth(0.1);
                                pdf.circle(x, y, 1.5, 'FD');
                            } else if (SECONDARY_COLORS[type as keyof typeof SECONDARY_COLORS]) {
                                pdf.setFillColor(SECONDARY_COLORS[type as keyof typeof SECONDARY_COLORS]);
                                pdf.setDrawColor(0, 0, 0);
                                pdf.setLineWidth(0.1);
                                if (type === 'Hemorrhage') {
                                    const s = 1.5;
                                    pdf.triangle(x, y - s, x + s, y, x, y + s, 'FD');
                                    pdf.triangle(x, y + s, x - s, y, x, y - s, 'FD');
                                } else {
                                    pdf.rect(x - 1.5, y - 1.5, 3, 3, 'FD');
                                }
                            }
                        };
                        if (data.column.index === 0) drawMarker((data.row.raw as string[])[1]);
                        else if (data.column.index === 2) drawMarker((data.row.raw as string[])[3]);
                    }
                }
            });

            const stats = { Normal: 0, Tortuous: 0, Enlarged: 0, Giant: 0, Ramified: 0, Bizarre: 0 };
            const secStats = { Hemorrhage: 0, Avascular: 0 };
            p.file.annotations?.loops.forEach(loop => stats[loop.morphology]++);
            p.file.annotations?.secondaries?.forEach(s => secStats[s.type]++);

            autoTable(pdf, {
                startY: (pdf as any).lastAutoTable.finalY + 5,
                head: [['Morphology / Type', 'Count']],
                body: [['Normal', stats.Normal], ['Tortuous', stats.Tortuous], ['Enlarged', stats.Enlarged], ['Giant', stats.Giant], ['Ramified', stats.Ramified], ['Bizarre', stats.Bizarre], ['TOTAL LOOPS', Object.values(stats).reduce((a, b) => a + b, 0)], ['Hemorrhage', secStats.Hemorrhage], ['Avascular', secStats.Avascular]],
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1 },
                headStyles: { fillColor: [60, 60, 60] },
                columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 20, halign: 'center' } },
                margin: { left: (pageWidth - 70) / 2 },
                didParseCell: (data) => {
                    if (data.row.index === 6) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; }
                    if (data.row.index >= 7) { data.cell.styles.textColor = data.row.index === 7 ? [153, 27, 27] : [107, 114, 128]; }
                }
            });
        }
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${patientId.replace(/[^a-zA-Z0-9_-]/g, '_')}_capillaroscopy_report_${timestamp}.pdf`;
    await saveFile(pdf.output('blob'), filename, [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]);
};
