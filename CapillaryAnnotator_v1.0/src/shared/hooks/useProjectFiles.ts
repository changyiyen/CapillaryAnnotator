import { useState, useCallback } from 'react';
import type { FileEntry } from '../types';

export function useProjectFiles() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(-1);
    const [patientId, setPatientId] = useState('');
    const [subdirectories, setSubdirectories] = useState<string[]>([]);
    const [selectedSubdirectory, setSelectedSubdirectory] = useState('');

    const currentFile = currentFileIndex >= 0 && currentFileIndex < files.length ? files[currentFileIndex] : null;

    const loadDirectory = useCallback((newFiles: FileEntry[], newPatientId: string, newSubdirs: string[]) => {
        setFiles(newFiles);
        setPatientId(newPatientId);
        setSubdirectories(newSubdirs);
        if (newSubdirs.length > 0) {
            setSelectedSubdirectory(newSubdirs[0]);
        }
        // Typically we load the first file after directory load, but let the consumer decide
    }, []);

    const selectFile = useCallback((index: number) => {
        setCurrentFileIndex(index);
        // We return the file from the current state if possible, 
        // but the index update is what matters for the 'first image' bug.
        if (index >= 0 && index < files.length) {
            return files[index];
        }
        return null;
    }, [files]);

    const updateFile = useCallback((index: number, updates: Partial<FileEntry>) => {
        setFiles(prev => {
            const newFiles = [...prev];
            if (index >= 0 && index < newFiles.length) {
                newFiles[index] = { ...newFiles[index], ...updates };
            }
            return newFiles;
        });
    }, []);

    const nextFile = useCallback(() => {
        if (files.length === 0) return null;
        const newIndex = currentFileIndex >= files.length - 1 ? 0 : currentFileIndex + 1;
        setCurrentFileIndex(newIndex);
        return files[newIndex];
    }, [files, currentFileIndex]);

    const prevFile = useCallback(() => {
        if (files.length === 0) return null;
        const newIndex = currentFileIndex <= 0 ? files.length - 1 : currentFileIndex - 1;
        setCurrentFileIndex(newIndex);
        return files[newIndex];
    }, [files, currentFileIndex]);

    return {
        files,
        setFiles,  // Expose setter for raw updates if strictly necessary
        currentFileIndex,
        currentFile,
        patientId,
        setPatientId,
        subdirectories,
        selectedSubdirectory,
        setSelectedSubdirectory,
        loadDirectory,
        selectFile,
        updateFile,
        nextFile,
        prevFile,
        hasFiles: files.length > 0
    };
}
