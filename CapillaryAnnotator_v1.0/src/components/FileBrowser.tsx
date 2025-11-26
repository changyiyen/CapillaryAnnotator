import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FileEntry } from '../types';

interface FileBrowserProps {
    files: FileEntry[];
    currentFileIndex: number;
    patientId: string;
    subdirectories: string[];
    selectedSubdirectory: string;
    onFileSelect: (index: number) => void;
    onDirectorySelect: (files: FileEntry[], patientId: string, subdirectories: string[]) => void;
    onSubdirectoryChange: (subdirectory: string) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
    files,
    currentFileIndex,
    patientId,
    subdirectories,
    selectedSubdirectory,
    onFileSelect,
    onDirectorySelect,
    onSubdirectoryChange
}) => {
    const [supportsFileSystem, setSupportsFileSystem] = useState(true);

    useEffect(() => {
        // Check if File System Access API is supported
        setSupportsFileSystem('showDirectoryPicker' in window);
    }, []);

    const extractPatientId = (dirName: string): string => {
        // Extract first 8 consecutive digits from the directory name
        const match = dirName.match(/\d{8}/);
        return match ? match[0] : dirName; // Fall back to full name if no 8 digits found
    };

    const handleSelectPatientDirectory = async () => {
        if (!supportsFileSystem) {
            alert('File browser is not supported in this browser. Please use Chrome, Edge, or Opera.');
            return;
        }

        try {
            // @ts-ignore - File System Access API
            const patientDirHandle = await window.showDirectoryPicker();
            const patientDirName = patientDirHandle.name;
            const patientIdentifier = extractPatientId(patientDirName);

            // Scan for subdirectories
            const subdirs: string[] = [];
            for await (const entry of patientDirHandle.values()) {
                if (entry.kind === 'directory') {
                    subdirs.push(entry.name);
                }
            }

            subdirs.sort();

            if (subdirs.length === 0) {
                alert('No subdirectories found in the selected patient directory.');
                return;
            }

            // Load files from the first subdirectory
            const firstSubdir = subdirs[0];
            // @ts-ignore
            const subdirHandle = await patientDirHandle.getDirectoryHandle(firstSubdir);
            const fileEntries = await loadFilesFromDirectory(subdirHandle);

            onDirectorySelect(fileEntries, patientIdentifier, subdirs);
        } catch (err) {
            console.error('Error selecting patient directory:', err);
        }
    };

    const handleSubdirectoryChange = async (subdirName: string) => {
        if (!subdirName) return;

        try {
            // We need to re-select the patient directory to access subdirectories
            // Since we can't persist directory handles, we'll need the user to allow access again
            // @ts-ignore
            const patientDirHandle = await window.showDirectoryPicker();

            // @ts-ignore
            const subdirHandle = await patientDirHandle.getDirectoryHandle(subdirName);
            const fileEntries = await loadFilesFromDirectory(subdirHandle);

            onSubdirectoryChange(subdirName);
            onDirectorySelect(fileEntries, patientDirHandle.name, subdirectories);
        } catch (err) {
            console.error('Error loading subdirectory:', err);
            alert('Failed to load subdirectory. You may need to grant permission again.');
        }
    };

    const loadFilesFromDirectory = async (dirHandle: any): Promise<FileEntry[]> => {
        const fileEntries: FileEntry[] = [];

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const ext = file.name.toLowerCase().split('.').pop();

                if (ext && ['jpg', 'jpeg', 'png'].includes(ext)) {
                    const isAnnotated = file.name.toLowerCase().includes('annotated');

                    // Generate thumbnail
                    const thumbnail = await generateThumbnail(file);

                    fileEntries.push({
                        file,
                        filename: file.name,
                        isAnnotated,
                        thumbnail
                    });
                }
            }
        }

        // Sort: non-annotated first, then alphabetically
        fileEntries.sort((a, b) => {
            if (a.isAnnotated !== b.isAnnotated) {
                return a.isAnnotated ? 1 : -1;
            }
            return a.filename.localeCompare(b.filename);
        });

        return fileEntries;
    };

    const generateThumbnail = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve('');
                        return;
                    }

                    const size = 100;
                    canvas.width = size;
                    canvas.height = size;

                    const scale = Math.min(size / img.width, size / img.height);
                    const x = (size - img.width * scale) / 2;
                    const y = (size - img.height * scale) / 2;

                    ctx.fillStyle = '#1f2937';
                    ctx.fillRect(0, 0, size, size);
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    resolve(canvas.toDataURL());
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleThumbnailClick = (index: number) => {
        if (index === currentFileIndex) return;

        const confirmed = window.confirm(
            'Switching files will save current annotations. Continue?'
        );

        if (confirmed) {
            onFileSelect(index);
        }
    };

    return (
        <div className="w-52 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
            <div className="p-3 border-b border-gray-700 flex-shrink-0">
                <h2 className="text-sm font-bold mb-2 text-gray-300">File Browser</h2>
                <button
                    onClick={handleSelectPatientDirectory}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors"
                    disabled={!supportsFileSystem}
                >
                    {supportsFileSystem ? 'Select Patient Folder' : 'Not Supported'}
                </button>

                {patientId && (
                    <div className="mt-2 text-xs text-gray-400">
                        <div className="font-semibold text-gray-300 mb-1">Patient:</div>
                        <div className="truncate" title={patientId}>{patientId}</div>
                    </div>
                )}
            </div>

            {subdirectories.length > 0 && (
                <div className="p-3 border-b border-gray-700 flex-shrink-0">
                    <label className="text-xs text-gray-400 mb-1 block">Image Set:</label>
                    <div className="relative">
                        <select
                            value={selectedSubdirectory}
                            onChange={(e) => handleSubdirectoryChange(e.target.value)}
                            className="w-full bg-gray-700 text-white text-xs py-2 px-3 pr-8 rounded border border-gray-600 appearance-none cursor-pointer hover:bg-gray-600 transition-colors"
                        >
                            {subdirectories.map((subdir) => (
                                <option key={subdir} value={subdir}>
                                    {subdir}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 min-h-0">{files.length === 0 ? (
                <p className="text-xs text-gray-500 text-center mt-4">
                    {patientId ? 'No images in selected folder' : 'No patient folder selected'}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {files.map((fileEntry, index) => (
                        <div
                            key={index}
                            onClick={() => handleThumbnailClick(index)}
                            className={`cursor-pointer rounded overflow-hidden border-2 transition-all ${index === currentFileIndex
                                ? 'border-blue-500'
                                : 'border-transparent hover:border-gray-600'
                                } ${fileEntry.isAnnotated ? 'opacity-50' : 'opacity-100'}`}
                            title={fileEntry.filename}
                        >
                            {fileEntry.thumbnail && (
                                <img
                                    src={fileEntry.thumbnail}
                                    alt={fileEntry.filename}
                                    className="w-full h-24 object-cover"
                                />
                            )}
                            <div className="bg-gray-900 p-1">
                                <p className="text-xs text-gray-300 truncate">
                                    {fileEntry.filename}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
};
