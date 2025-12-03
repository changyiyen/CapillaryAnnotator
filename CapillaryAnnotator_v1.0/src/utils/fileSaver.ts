interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
}

/**
 * Save a file using the File System Access API if available, otherwise fall back to download link.
 * @param blob The file content as a Blob
 * @param suggestedName The suggested file name
 * @param types Optional file types for the picker
 */
export const saveFile = async (
    blob: Blob,
    suggestedName: string,
    types?: FilePickerAcceptType[]
) => {
    // Try File System Access API first
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName,
                types
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            // User cancelled or API failed, fall back to download link
            if (err.name !== 'AbortError') {
                console.warn('File System Access API failed, falling back to download link:', err);
            } else {
                return; // User cancelled
            }
        }
    }

    // Fallback: Download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
