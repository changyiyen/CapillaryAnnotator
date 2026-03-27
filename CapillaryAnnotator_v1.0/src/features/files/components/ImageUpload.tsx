import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
    onImageUpload: (file: File) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateAndUpload = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            onImageUpload(file);
        } else {
            alert('Please upload a valid image file (JPG, PNG).');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            validateAndUpload(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) {
            validateAndUpload(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    return (
        <div
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-300 text-lg font-medium">Click or drag image to upload</p>
            <p className="text-gray-500 text-sm mt-2">Supports JPG, PNG</p>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};
