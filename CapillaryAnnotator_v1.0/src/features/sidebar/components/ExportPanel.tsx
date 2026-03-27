import React from 'react';
import { Download, Sparkles, Loader2, FileArchive, FileText, Stethoscope, Image as ImageIcon, Contrast } from 'lucide-react';
import clsx from 'clsx';

interface ExportPanelProps {
    onExport: () => void;
    onExportImage: () => void;
    onBatchPDFExport: () => void;
    onBatchImageExport: () => void;
    onExportLabelMe: () => void;
    onExportTextReport: () => void;
    onExportClinicalReport: () => void;
    hasMultipleFiles: boolean;
    annotationMode: 'simple' | 'polygon';
    onToggleEnhancement: (type: 'full' | 'clahe') => void;
    enhancementType: 'none' | 'full' | 'clahe';
    isEnhancing: boolean;
    hasImage: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
    onExport,
    onExportImage,
    onBatchPDFExport,
    onBatchImageExport,
    onExportLabelMe,
    onExportTextReport,
    onExportClinicalReport,
    hasMultipleFiles,
    annotationMode,
    onToggleEnhancement,
    enhancementType,
    isEnhancing,
    hasImage,
}) => {
    return (
        <div className="p-3 border-t border-gray-700">
            <div className="grid grid-cols-6 gap-2">
                {/* Full Enhancement Toggle */}
                <button
                    onClick={() => onToggleEnhancement('full')}
                    disabled={isEnhancing || !hasImage}
                    title={isEnhancing ? 'Processing...' : enhancementType === 'full' ? 'Full Enhanced View Enabled' : 'Enhance Image (Full)'}
                    className={clsx(
                        "flex items-center justify-center p-2 rounded transition-colors col-span-1",
                        isEnhancing || !hasImage
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : enhancementType === 'full'
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                >
                    {isEnhancing && enhancementType === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>

                {/* CLAHE Toggle */}
                <button
                    onClick={() => onToggleEnhancement('clahe')}
                    disabled={isEnhancing || !hasImage}
                    title={isEnhancing ? 'Processing...' : enhancementType === 'clahe' ? 'CLAHE Enhanced View Enabled' : 'Enhance Image (CLAHE)'}
                    className={clsx(
                        "flex items-center justify-center p-2 rounded transition-colors col-span-1",
                        isEnhancing || !hasImage
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : enhancementType === 'clahe'
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-teal-600 hover:bg-teal-700 text-white"
                    )}
                >
                    {isEnhancing && enhancementType === 'clahe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Contrast className="w-4 h-4" />}
                </button>

                <button
                    onClick={onExport}
                    title="Export JSON Data"
                    className="flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors col-span-1"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button
                    onClick={onExportImage}
                    title="Export Annotated Image"
                    className="flex items-center justify-center p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors col-span-1"
                >
                    <ImageIcon className="w-4 h-4" />
                </button>
                
                {hasMultipleFiles && (
                    <button
                        onClick={onBatchImageExport}
                        title="Export Images (ZIP)"
                        className="flex items-center justify-center p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors col-span-1"
                    >
                        <FileArchive className="w-4 h-4" />
                    </button>
                )}
                
                {hasMultipleFiles && annotationMode === 'simple' && (
                    <>
                        <button
                            onClick={onBatchPDFExport}
                            title="Export Batch PDF"
                            className="flex items-center justify-center p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors col-span-1"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onExportTextReport}
                            title="Export Text Report"
                            className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors col-span-1"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onExportClinicalReport}
                            title="Export Clinical Report"
                            className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors col-span-1"
                        >
                            <Stethoscope className="w-4 h-4" />
                        </button>
                    </>
                )}
                
                {annotationMode === 'polygon' && (
                    <button
                        onClick={onExportLabelMe}
                        title="Export LabelMe JSON"
                        className="flex items-center justify-center p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors col-span-1"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
