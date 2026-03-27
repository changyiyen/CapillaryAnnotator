import JSZip from 'jszip';
import type { FileEntry } from '../../../shared/types';
import { saveFile } from '../../../shared/utils/fileSaver';
import { renderAnnotatedImage } from '../../annotation/utils/canvasRenderer';

export const generateZipArchive = async (
    files: FileEntry[],
    patientId: string
): Promise<void> => {
    // Filter only annotated files (must have actual data)
    const annotatedFiles = files.filter(f => {
        if (!f.annotations) return false;
        const { loops, secondaries, rulers, roi } = f.annotations;
        return (
            (loops && loops.length > 0) ||
            (secondaries && secondaries.length > 0) ||
            (rulers && rulers.length > 0) ||
            roi !== null
        );
    });

    if (annotatedFiles.length === 0) {
        alert('No annotated images found to export.');
        return;
    }

    const zip = new JSZip();
    const folderName = `annotated_images`;
    const folder = zip.folder(folderName);

    if (!folder) {
        throw new Error("Failed to create folder in ZIP archive");
    }

    // Process files sequentially to avoid memory spikes
    for (const file of annotatedFiles) {
        const imageData = await renderAnnotatedImage(file);
        if (imageData) {
            // Remove data URI prefix to get raw base64
            const base64Data = imageData.data.replace(/^data:image\/jpeg;base64,/, "");
            const fileName = `${file.filename.replace(/\.[^/.]+$/, "")}_annotated.jpg`;
            folder.file(fileName, base64Data, { base64: true });
        }
    }

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: "blob" });

    // Save ZIP
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const safePatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safePatientId}_annotated_images_${timestamp}.zip`;

    await saveFile(blob, filename, [{
        description: 'ZIP Archive',
        accept: { 'application/zip': ['.zip'] }
    }]);
};
