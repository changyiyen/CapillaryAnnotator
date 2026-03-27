import React from 'react';
import { MousePointer2, AlertCircle, Ruler, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { MorphologySelect } from '../../../features/morphology/components/MorphologySelect';
import type { Loop, SecondaryAnnotation } from '../../../shared/types';

interface AnnotationToolsProps {
    activeTool: 'select' | 'roi' | 'measure' | 'secondary';
    setActiveTool: (tool: 'select' | 'roi' | 'measure' | 'secondary') => void;
    annotationMode: 'simple' | 'polygon';
    setAnnotationMode: (mode: 'simple' | 'polygon') => void;
    selectedMorphology: Loop['morphology'];
    onMorphologyChange: (morphology: Loop['morphology']) => void;
    selectedSecondaryType: SecondaryAnnotation['type'];
    onSecondaryTypeChange: (type: SecondaryAnnotation['type']) => void;
}

export const AnnotationTools: React.FC<AnnotationToolsProps> = ({
    activeTool,
    setActiveTool,
    annotationMode,
    setAnnotationMode,
    selectedMorphology,
    onMorphologyChange,
    selectedSecondaryType,
    onSecondaryTypeChange,
}) => {
    return (
        <>
            {/* Mode Toggle */}
            <div className="p-3 border-b border-gray-700">
                <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setAnnotationMode('simple')}
                        className={clsx(
                            "flex-1 py-1 px-1.5 rounded text-xs font-medium transition-colors",
                            annotationMode === 'simple'
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-400 hover:text-gray-200"
                        )}
                    >
                        Simple
                    </button>
                    <button
                        onClick={() => setAnnotationMode('polygon')}
                        className={clsx(
                            "flex-1 py-1 px-1.5 rounded text-xs font-medium transition-colors",
                            annotationMode === 'polygon'
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-400 hover:text-gray-200"
                        )}
                    >
                        Polygon
                    </button>
                </div>
            </div>

            {/* Polygon Morphology Selector */}
            {annotationMode === 'polygon' && (
                <div className="p-3 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-xs font-semibold mb-1 text-gray-300">Capillary Type</h3>
                    <MorphologySelect
                        value={selectedMorphology}
                        onChange={onMorphologyChange}
                    />
                    <div className="mt-1.5 text-[10px] text-gray-400">
                        Polygons will be labeled with this morphology type
                    </div>
                </div>
            )}

            {/* Tools Section - Only for Simple Mode */}
            {annotationMode === 'simple' && (
                <div className="p-3 border-b border-gray-700">
                    <h2 className="text-base font-bold mb-2">Tools</h2>
                    <div className="flex gap-2">
                        <button
                            className={clsx(
                                "p-1.5 rounded hover:bg-gray-700 transition-colors",
                                activeTool === 'select' && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => setActiveTool('select')}
                            title="Mark Loop"
                        >
                            <MousePointer2 className="w-5 h-5" />
                        </button>
                        <button
                            className={clsx(
                                "p-1.5 rounded hover:bg-gray-700 transition-colors",
                                activeTool === 'secondary' && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => setActiveTool('secondary')}
                            title="Mark Hemorrhage/Avascular"
                        >
                            <AlertCircle className="w-5 h-5" />
                        </button>
                        <button
                            className={clsx(
                                "p-1.5 rounded hover:bg-gray-700 transition-colors",
                                activeTool === 'roi' && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => setActiveTool('roi')}
                            title="Set Assessment Box (1mm×1mm)"
                        >
                            <div className="w-5 h-5 border-2 border-dashed border-current rounded-sm" />
                        </button>
                        <button
                            className={clsx(
                                "p-1.5 rounded hover:bg-gray-700 transition-colors",
                                activeTool === 'measure' && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => setActiveTool('measure')}
                            title="Ruler / Measure"
                        >
                            <Ruler className="w-5 h-5" />
                        </button>

                        <div className="w-px h-8 bg-gray-700 mx-1" />

                        <button
                            className="p-1.5 rounded bg-gray-700 opacity-50 cursor-not-allowed"
                            disabled={true}
                            title="Auto-Detect (Coming Soon)"
                        >
                            <Wand2 className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>
            )}

            {/* Morphology Selector */}
            {annotationMode === 'simple' && activeTool === 'select' && (
                <div className="p-3 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-xs font-semibold mb-1 text-gray-300">Loop Morphology</h3>
                    <MorphologySelect
                        value={selectedMorphology}
                        onChange={onMorphologyChange}
                    />
                    <div className="mt-1.5 text-[10px] text-gray-400">
                        Markers will be colored by morphology type
                    </div>
                </div>
            )}

            {/* Secondary Selector */}
            {annotationMode === 'simple' && activeTool === 'secondary' && (
                <div className="p-3 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-xs font-semibold mb-1 text-gray-300">Annotation Type</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSecondaryTypeChange('Hemorrhage')}
                            className={clsx(
                                "flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 border transition-colors",
                                selectedSecondaryType === 'Hemorrhage'
                                    ? "bg-red-900/50 border-red-500 text-white"
                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            )}
                        >
                            <div className="w-2.5 h-2.5 bg-[#991b1b] rotate-45" /> {/* Diamond */}
                            Hemorrhage
                        </button>
                        <button
                            onClick={() => onSecondaryTypeChange('Avascular')}
                            className={clsx(
                                "flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 border transition-colors",
                                selectedSecondaryType === 'Avascular'
                                    ? "bg-gray-600 border-gray-400 text-white"
                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            )}
                        >
                            <div className="w-2.5 h-2.5 bg-gray-500" /> {/* Square */}
                            Avascular
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
