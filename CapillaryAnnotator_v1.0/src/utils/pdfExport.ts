import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FileEntry, MorphologyStats, SecondaryStats } from '../types';
import { MORPHOLOGY_COLORS, SECONDARY_COLORS } from '../constants';

export const generateBatchPDF = async (
    files: FileEntry[],
    patientId: string
): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Filter only annotated files
    const annotatedFiles = files.filter(f => f.annotations);

    if (annotatedFiles.length === 0) {
        alert('No annotated images found to export.');
        return;
    }

    // 1. TITLE PAGE
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Capillaroscopy Analysis Report', pageWidth / 2, 60, { align: 'center' });

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Patient ID: ${patientId}`, pageWidth / 2, 80, { align: 'center' });

    const now = new Date();
    const isoDateTime = now.toISOString().replace('T', ' ').slice(0, 19); // YYYY-MM-DD HH:MM:SS
    pdf.text(
        `Generated: ${isoDateTime}`,
        pageWidth / 2,
        90,
        { align: 'center' }
    );

    pdf.text(
        `Total Images: ${annotatedFiles.length} `,
        pageWidth / 2,
        100,
        { align: 'center' }
    );

    pdf.setFontSize(10);
    pdf.text('Nailfold Capillaroscopy Annotator v1.0', pageWidth / 2, pageHeight - 20, {
        align: 'center'
    });

    // 2. SUMMARY PAGE
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary Statistics', 14, 20);

    // Prepare table data
    const tableData: any[][] = [];
    let grandTotal: MorphologyStats = {
        Normal: 0,
        Tortuous: 0,
        Enlarged: 0,
        Giant: 0,
        Ramified: 0,
        Bizarre: 0
    };
    let grandTotalSecondary: SecondaryStats = {
        Hemorrhage: 0,
        Avascular: 0
    };

    annotatedFiles.forEach((file) => {
        if (!file.annotations) return;

        const stats: MorphologyStats = {
            Normal: 0,
            Tortuous: 0,
            Enlarged: 0,
            Giant: 0,
            Ramified: 0,
            Bizarre: 0
        };

        const secStats: SecondaryStats = {
            Hemorrhage: 0,
            Avascular: 0
        };

        file.annotations.loops.forEach((loop) => {
            stats[loop.morphology]++;
        });

        if (file.annotations.secondaries) {
            file.annotations.secondaries.forEach(s => {
                secStats[s.type]++;
            });
        }

        const totalLoops = Object.values(stats).reduce((sum, count) => sum + count, 0);

        tableData.push([
            file.filename,
            stats.Normal,
            stats.Tortuous,
            stats.Enlarged,
            stats.Giant,
            stats.Ramified,
            stats.Bizarre,
            totalLoops,
            secStats.Hemorrhage,
            secStats.Avascular
        ]);

        // Add to grand total
        Object.keys(grandTotal).forEach((key) => {
            grandTotal[key as keyof MorphologyStats] += stats[key as keyof MorphologyStats];
        });
        Object.keys(grandTotalSecondary).forEach((key) => {
            grandTotalSecondary[key as keyof SecondaryStats] += secStats[key as keyof SecondaryStats];
        });
    });

    // Add totals row
    const allTotalLoops = Object.values(grandTotal).reduce((sum, count) => sum + count, 0);
    tableData.push([
        'TOTAL',
        grandTotal.Normal,
        grandTotal.Tortuous,
        grandTotal.Enlarged,
        grandTotal.Giant,
        grandTotal.Ramified,
        grandTotal.Bizarre,
        allTotalLoops,
        grandTotalSecondary.Hemorrhage,
        grandTotalSecondary.Avascular
    ]);

    // Average row
    const avgTotalLoops = (allTotalLoops / annotatedFiles.length).toFixed(1);
    tableData.push([
        'AVERAGE',
        (grandTotal.Normal / annotatedFiles.length).toFixed(1),
        (grandTotal.Tortuous / annotatedFiles.length).toFixed(1),
        (grandTotal.Enlarged / annotatedFiles.length).toFixed(1),
        (grandTotal.Giant / annotatedFiles.length).toFixed(1),
        (grandTotal.Ramified / annotatedFiles.length).toFixed(1),
        (grandTotal.Bizarre / annotatedFiles.length).toFixed(1),
        avgTotalLoops,
        (grandTotalSecondary.Hemorrhage / annotatedFiles.length).toFixed(1),
        (grandTotalSecondary.Avascular / annotatedFiles.length).toFixed(1)
    ]);

    autoTable(pdf, {
        startY: 30,
        head: [['Image', 'Normal', 'Tortuous', 'Enlarged', 'Giant', 'Ramified', 'Bizarre', 'Loops', 'Hemo', 'Avasc']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { halign: 'center', cellWidth: 15 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'center', cellWidth: 13 },
            5: { halign: 'center', cellWidth: 18 },
            6: { halign: 'center', cellWidth: 16 },
            7: { halign: 'center', cellWidth: 13, fontStyle: 'bold' },
            8: { halign: 'center', cellWidth: 15, textColor: [153, 27, 27] },
            9: { halign: 'center', cellWidth: 14, textColor: [107, 114, 128] }
        },
        didParseCell: (data) => {
            if (data.row.index === tableData.length - 2 || data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [243, 244, 246];
            }
        }
    });

    // 3. ANNOTATED IMAGES (one per page)
    for (const file of annotatedFiles) {
        pdf.addPage();

        // Header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(file.filename, 14, 15);

        // Try to get the annotated canvas image
        // We'll need to generate it from the stored annotations
        const imageData = await generateAnnotatedImage(file);

        if (imageData) {
            // Add image (maintain aspect ratio, fit to page)
            const imgWidth = pageWidth - 28; // 14mm margins on each side
            const imgHeight = (imgWidth * imageData.height) / imageData.width;

            let finalHeight = imgHeight;
            let finalWidth = imgWidth;

            // Calculate space needed for legend (30mm) and stats table (40mm)
            const legendHeight = 30;
            const statsHeight = 40;
            const spacing = 5; // Spacing between elements
            const headerHeight = 25; // Space for filename header

            const maxImageHeight = pageHeight - headerHeight - legendHeight - statsHeight - (spacing * 3);

            if (imgHeight > maxImageHeight) {
                finalHeight = maxImageHeight;
                finalWidth = (finalHeight * imageData.width) / imageData.height;
            }

            const xPos = (pageWidth - finalWidth) / 2;
            const imageStartY = 20;

            pdf.addImage(imageData.data, 'JPEG', xPos, imageStartY, finalWidth, finalHeight);

            // Calculate positions dynamically based on image height
            const imageEndY = imageStartY + finalHeight;
            const legendStartY = imageEndY + spacing;

            // --- LEGEND TABLE ---
            const legendData = [
                ['', 'Normal', '', 'Ramified'],
                ['', 'Tortuous', '', 'Bizarre'],
                ['', 'Enlarged', '', 'Hemorrhage'],
                ['', 'Giant', '', 'Avascular']
            ];

            autoTable(pdf, {
                startY: legendStartY,
                head: [['Marker', 'Type', 'Marker', 'Type']],
                body: legendData,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 2, minCellHeight: 6 },
                headStyles: { fontSize: 8, fontStyle: 'bold', textColor: [100, 100, 100] },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 35 }
                },
                margin: { left: (pageWidth - 100) / 2 }, // Center table (100mm width)
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const x = data.cell.x + data.cell.width / 2;
                        const y = data.cell.y + data.cell.height / 2;

                        // Helper to draw marker
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
                                    // Diamond - draw as rotated square
                                    const s = 1.5;
                                    pdf.triangle(x, y - s, x + s, y, x, y + s, 'FD'); // Right half
                                    pdf.triangle(x, y + s, x - s, y, x, y - s, 'FD'); // Left half
                                } else {
                                    // Square
                                    pdf.rect(x - 1.5, y - 1.5, 3, 3, 'FD');
                                }
                            }
                        };

                        if (data.column.index === 0) {
                            const rowData = data.row.raw as string[];
                            drawMarker(rowData[1]);
                        } else if (data.column.index === 2) {
                            const rowData = data.row.raw as string[];
                            drawMarker(rowData[3]);
                        }
                    }
                }
            });

            // Get the Y position after the legend table
            const legendEndY = (pdf as any).lastAutoTable.finalY;
            const statsStartY = legendEndY + spacing;

            // Footer with stats
            if (file.annotations) {
                const stats: MorphologyStats = {
                    Normal: 0,
                    Tortuous: 0,
                    Enlarged: 0,
                    Giant: 0,
                    Ramified: 0,
                    Bizarre: 0
                };
                const secStats: SecondaryStats = {
                    Hemorrhage: 0,
                    Avascular: 0
                };

                file.annotations.loops.forEach((loop) => {
                    stats[loop.morphology]++;
                });

                if (file.annotations.secondaries) {
                    file.annotations.secondaries.forEach(s => {
                        secStats[s.type]++;
                    });
                }

                // Footer with stats table
                const statsTableData = [
                    ['Normal', stats.Normal],
                    ['Tortuous', stats.Tortuous],
                    ['Enlarged', stats.Enlarged],
                    ['Giant', stats.Giant],
                    ['Ramified', stats.Ramified],
                    ['Bizarre', stats.Bizarre],
                    ['TOTAL LOOPS', Object.values(stats).reduce((a, b) => a + b, 0)],
                    ['Hemorrhage', secStats.Hemorrhage],
                    ['Avascular', secStats.Avascular]
                ];

                autoTable(pdf, {
                    startY: statsStartY,
                    head: [['Morphology / Type', 'Count']],
                    body: statsTableData,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 1 },
                    headStyles: { fillColor: [60, 60, 60] },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { cellWidth: 20, halign: 'center' }
                    },
                    margin: { left: (pageWidth - 70) / 2 }, // Center the table
                    didParseCell: (data) => {
                        if (data.row.index === 6) { // Total Loops row
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [240, 240, 240];
                        }
                        if (data.row.index >= 7) { // Secondary annotations
                            data.cell.styles.textColor = data.row.index === 7 ? [153, 27, 27] : [107, 114, 128];
                        }
                    }
                });
            }
        }
    }

    // Save PDF
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); // YYYY-MM-DDTHH-MM-SS
    const safePatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safePatientId}_capillaroscopy_report_${timestamp}.pdf`);
};

// Helper to generate annotated image from stored data
const generateAnnotatedImage = async (
    file: FileEntry
): Promise<{ data: string; width: number; height: number } | null> => {
    return new Promise((resolve) => {
        if (!file.file || !file.annotations) {
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');

            // Resize image to reduce file size (max 1920px width)
            const maxWidth = 1920;
            const scale = Math.min(1, maxWidth / img.width);

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(null);
                return;
            }

            // Scale context for reduced size
            ctx.scale(scale, scale);

            // 1. Draw Image
            ctx.drawImage(img, 0, 0);

            // 2. Draw ROI
            if (file.annotations?.roi) {
                const { roi, scale: fileScale } = file.annotations;
                // ROI is 1mm x 1mm (1000 x 1000 microns). Convert to pixels.
                // scale is pixels per micron.
                const boxSize = 1000 * fileScale;

                ctx.strokeStyle = '#00ff00'; // Green
                ctx.lineWidth = 2;
                ctx.strokeRect(roi.x, roi.y, boxSize, boxSize);

                // Label
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(roi.x, roi.y - 25, 120, 25);
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.fillText('Assessment Box', roi.x + 5, roi.y - 7);
            }

            // 3. Draw Rulers
            if (file.annotations?.rulers) {
                file.annotations.rulers.forEach(ruler => {
                    const { x1, y1, x2, y2 } = ruler;
                    const rulerScale = file.annotations?.scale || 1;

                    // Line
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = '#3b82f6'; // Blue
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Endpoints - Perpendicular line segments (orange)
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const perpLength = 10; // Length of perpendicular line on each side

                    ctx.strokeStyle = '#f97316';
                    ctx.lineWidth = 3;

                    // Start point perpendicular line
                    ctx.beginPath();
                    ctx.moveTo(
                        x1 - perpLength * Math.sin(angle),
                        y1 + perpLength * Math.cos(angle)
                    );
                    ctx.lineTo(
                        x1 + perpLength * Math.sin(angle),
                        y1 - perpLength * Math.cos(angle)
                    );
                    ctx.stroke();

                    // End point perpendicular line
                    ctx.beginPath();
                    ctx.moveTo(
                        x2 - perpLength * Math.sin(angle),
                        y2 + perpLength * Math.cos(angle)
                    );
                    ctx.lineTo(
                        x2 + perpLength * Math.sin(angle),
                        y2 - perpLength * Math.cos(angle)
                    );
                    ctx.stroke();

                    // Text
                    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const lengthMicrons = distance / rulerScale;

                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    // Reuse angle calculated above
                    const offsetDistance = 35;
                    const textX = midX + Math.cos(angle + Math.PI / 2) * offsetDistance;
                    const textY = midY + Math.sin(angle + Math.PI / 2) * offsetDistance;

                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 0.5;
                    ctx.font = '28px Arial';
                    const text = `${lengthMicrons.toFixed(1)} µm`;
                    ctx.fillText(text, textX, textY);
                    ctx.strokeText(text, textX, textY);
                });
            }

            // 4. Draw Loops
            if (file.annotations?.loops) {
                file.annotations.loops.forEach(loop => {
                    const color = MORPHOLOGY_COLORS[loop.morphology] || '#3b82f6';

                    ctx.beginPath();
                    ctx.arc(loop.x, loop.y, 8, 0, Math.PI * 2); // Fixed radius 8px
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }

            // 5. Draw Secondary Annotations
            if (file.annotations?.secondaries) {
                file.annotations.secondaries.forEach(s => {
                    ctx.save();
                    ctx.translate(s.x, s.y);
                    if (s.type === 'Hemorrhage') {
                        ctx.rotate(45 * Math.PI / 180);
                    }
                    ctx.fillStyle = SECONDARY_COLORS[s.type];

                    // Draw centered rect (12x12)
                    ctx.fillRect(-6, -6, 12, 12);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-6, -6, 12, 12);

                    ctx.restore();
                });
            }

            // 6. Draw Filename Overlay
            const filename = file.filename.replace(/\.[^/.]+$/, ""); // Remove extension
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(10, 10, ctx.measureText(filename).width + 20, 30);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(filename, 20, 30);

            // Use JPEG compression to reduce file size (quality 0.85)
            resolve({
                data: canvas.toDataURL('image/jpeg', 0.85),
                width: canvas.width,
                height: canvas.height
            });
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(file.file);
    });
};
