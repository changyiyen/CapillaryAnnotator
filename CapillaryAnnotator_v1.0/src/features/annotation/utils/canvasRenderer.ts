import type { FileEntry, Loop, SecondaryAnnotation, RulerLine, ROI, Polygon } from '../../../shared/types';
import { MORPHOLOGY_COLORS, SECONDARY_COLORS } from '../../../shared/constants';

export interface RenderedImage {
    data: string; // Base64 data URI
    width: number;
    height: number;
}

/**
 * Renders an annotated image to a data URL using a canvas.
 * Consolidates rendering logic for PDF and ZIP exports.
 */
export const renderAnnotatedImage = async (
    file: FileEntry,
    options: {
        maxWidth?: number;
        quality?: number;
        displayName?: string;
    } = {}
): Promise<RenderedImage | null> => {
    const { maxWidth = 1920, quality = 0.85, displayName } = options;

    return new Promise((resolve) => {
        if (!file.file || !file.annotations) {
            resolve(null);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file.file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');

            // Resize image to reduce file size
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

            const { roi, scale: fileScale, rotation = 0, loops, secondaries, rulers, polygons } = file.annotations;

            // 2. Draw ROI
            if (roi) {
                const boxSize = 1000 * fileScale;
                ctx.save();
                
                // Onscreen, the ROI is a screen-aligned box whose top-left corner is pinned 
                // to a specific image pixel (roi.x, roi.y).
                // In the unrotated export image, this means the box must be rotated by 
                // -rotation around its top-left corner (roi.x, roi.y).
                ctx.translate(roi.x, roi.y);
                ctx.rotate((-rotation * Math.PI) / 180);
                
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, boxSize, boxSize);

                // Label
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, -25, 120, 25);
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.fillText('Assessment Box', 5, -7);
                
                ctx.restore();
            }

            // 3. Draw Rulers
            if (rulers) {
                rulers.forEach(ruler => {
                    const { x1, y1, x2, y2 } = ruler;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Endpoints
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const perpLength = 10;
                    ctx.strokeStyle = '#f97316';
                    ctx.lineWidth = 3;

                    ctx.beginPath();
                    ctx.moveTo(x1 - perpLength * Math.sin(angle), y1 + perpLength * Math.cos(angle));
                    ctx.lineTo(x1 + perpLength * Math.sin(angle), y1 - perpLength * Math.cos(angle));
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x2 - perpLength * Math.sin(angle), y2 + perpLength * Math.cos(angle));
                    ctx.lineTo(x2 + perpLength * Math.sin(angle), y2 - perpLength * Math.cos(angle));
                    ctx.stroke();

                    // Text
                    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const lengthMicrons = distance / fileScale;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
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

            // 4. Draw Polygons
            if (polygons) {
                polygons.forEach((poly: any) => {
                    const color = MORPHOLOGY_COLORS[poly.morphology as keyof typeof MORPHOLOGY_COLORS] || MORPHOLOGY_COLORS.Normal;
                    ctx.beginPath();
                    poly.points.forEach((p: any, i: number) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    if (poly.isClosed) ctx.closePath();
                    ctx.fillStyle = `${color}33`;
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    poly.points.forEach((p: any) => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    });
                });
            }

            // 5. Draw Loops
            if (loops) {
                loops.forEach(loop => {
                    const color = MORPHOLOGY_COLORS[loop.morphology] || '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(loop.x, loop.y, 8, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }

            // 6. Draw Secondaries
            if (secondaries) {
                secondaries.forEach(s => {
                    ctx.save();
                    ctx.translate(s.x, s.y);
                    if (s.type === 'Hemorrhage') ctx.rotate(45 * Math.PI / 180);
                    ctx.fillStyle = SECONDARY_COLORS[s.type];
                    ctx.fillRect(-6, -6, 12, 12);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-6, -6, 12, 12);
                    ctx.restore();
                });
            }

            // 7. Filename Overlay
            const overlayText = displayName || file.filename.replace(/\.[^/.]+$/, "");
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(10, 10, ctx.measureText(overlayText).width + 20, 30);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(overlayText, 20, 30);

            resolve({
                data: canvas.toDataURL('image/jpeg', quality),
                width: canvas.width,
                height: canvas.height
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        img.src = url;
    });
};
