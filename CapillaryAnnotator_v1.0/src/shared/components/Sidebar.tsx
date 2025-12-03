import React, { useState } from 'react';
import { MousePointer2, Ruler, Download, X, AlertCircle, Wand2, Sparkles, Loader2, RotateCw, Sun, Palette, SlidersHorizontal, CircleDot, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { Loop, RulerLine, SecondaryAnnotation } from '../types';
import { MorphologySelect } from '../../features/morphology/components/MorphologySelect';

interface SidebarProps {
    activeTool: 'select' | 'roi' | 'measure' | 'secondary';
    setActiveTool: (tool: 'select' | 'roi' | 'measure' | 'secondary') => void;
    loops: Loop[];
    secondaries: SecondaryAnnotation[];
    rulers: RulerLine[];
    scale: number;
    onScaleChange: (scale: number) => void;
    rotation: number;
    onRotationChange: (rotation: number) => void;
    brightness: number;
    onBrightnessChange: (brightness: number) => void;
    contrast: number;
    onContrastChange: (contrast: number) => void;
    hue: number;
    onHueChange: (hue: number) => void;
    selectedMorphology: Loop['morphology'];
    onMorphologyChange: (morphology: Loop['morphology']) => void;
    selectedSecondaryType: SecondaryAnnotation['type'];
    onSecondaryTypeChange: (type: SecondaryAnnotation['type']) => void;
    onDeleteLoop: (id: string) => void;
    onDeleteSecondary: (id: string) => void;
    onDeleteRuler: (id: string) => void;
    onExport: () => void;
    onExportImage: () => void;
    onBatchPDFExport: () => void;
    hasMultipleFiles: boolean;
    onHoverAnnotation: (id: string | null) => void;
    // onAutoDetect: () => void; // Disabled for now
    // isDetecting: boolean; // Disabled for now
    isEnhanced: boolean;
    isEnhancing: boolean;
    onToggleEnhancement: () => void;
    hasImage: boolean;
    onAutoAlign: () => void;
    isAligning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeTool,
    setActiveTool,
    loops,
    secondaries,
    rulers,
    scale,
    onScaleChange,
    rotation,
    onRotationChange,
    brightness,
    onBrightnessChange,
    contrast,
    onContrastChange,
    hue,
    onHueChange,
    selectedMorphology,
    onMorphologyChange,
    selectedSecondaryType,
    onSecondaryTypeChange,
    onDeleteLoop,
    onDeleteSecondary,
    onDeleteRuler,
    onExport,
    onExportImage,
    onBatchPDFExport,
    hasMultipleFiles,
    onHoverAnnotation,
    isEnhanced,
    isEnhancing,
    onToggleEnhancement,
    hasImage,
    onAutoAlign,
    isAligning
}) => {
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    const [isRotationOpen, setIsRotationOpen] = useState(false);
    const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);

    return (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full text-white">
            {/* Calibration Section */}
            <div className="border-b border-gray-700">
                <button
                    onClick={() => setIsCalibrationOpen(!isCalibrationOpen)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <Ruler className="w-4 h-4" />
                        Calibration
                    </h3>
                    {isCalibrationOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>

                {isCalibrationOpen && (
                    <div className="px-4 pb-4 space-y-2">
                        <label className="text-sm text-gray-400">Pixels per Micron (µm)</label>
                        <input
                            type="number"
                            value={scale}
                            onChange={(e) => onScaleChange(parseFloat(e.target.value) || 1)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            step="0.1"
                            min="0.1"
                        />
                        <p className="text-xs text-gray-500">
                            1 mm assessment box = {(1000 * scale).toFixed(0)} pixels
                        </p>
                    </div>
                )}
            </div>

            {/* Image Rotation Section */}
            <div className="border-b border-gray-700">
                <button
                    onClick={() => setIsRotationOpen(!isRotationOpen)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <RotateCw className="w-4 h-4" />
                        Rotation
                    </h3>
                    <div className="flex items-center gap-2">
                        {!isRotationOpen && rotation !== 0 && (
                            <span className="text-xs text-blue-400">{rotation.toFixed(1)}°</span>
                        )}
                        {isRotationOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>
                </button>

                {isRotationOpen && (
                    <div className="px-4 pb-4 space-y-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Angle</span>
                            <span>{rotation.toFixed(1)}°</span>
                        </div>
                        <input
                            type="range"
                            min="-45"
                            max="45"
                            step="0.1"
                            value={rotation}
                            onChange={(e) => onRotationChange(parseFloat(e.target.value))}
                            disabled={!hasImage}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => onRotationChange(0)}
                                disabled={!hasImage || rotation === 0}
                                className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-xs rounded text-gray-300 disabled:opacity-50"
                            >
                                Reset
                            </button>
                            <button
                                onClick={onAutoAlign}
                                disabled={!hasImage || isAligning}
                                className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-xs rounded text-white disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                                {isAligning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                Auto-Align
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Adjustments Section */}
            <div className="border-b border-gray-700">
                <button
                    onClick={() => setIsAdjustmentsOpen(!isAdjustmentsOpen)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        Adjustments
                    </h3>
                    <div className="flex items-center gap-2">
                        {!isAdjustmentsOpen && (brightness !== 0 || contrast !== 0 || hue !== 0) && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        {isAdjustmentsOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>
                </button>

                {isAdjustmentsOpen && (
                    <div className="px-4 pb-4 space-y-4">
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    onBrightnessChange(0);
                                    onContrastChange(0);
                                    onHueChange(0);
                                }}
                                disabled={!hasImage || (brightness === 0 && contrast === 0 && hue === 0)}
                                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:hover:text-blue-400"
                            >
                                Reset All
                            </button>
                        </div>

                        {/* Brightness */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brightness</span>
                                <span>{brightness > 0 ? '+' : ''}{brightness.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.05"
                                value={brightness}
                                onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                                disabled={!hasImage}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1"><CircleDot className="w-3 h-3" /> Contrast</span>
                                <span>{contrast > 0 ? '+' : ''}{contrast.toFixed(0)}</span>
                            </div>
                            <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={contrast}
                                onChange={(e) => onContrastChange(parseFloat(e.target.value))}
                                disabled={!hasImage}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Hue */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Palette className="w-3 h-3" /> Hue</span>
                                <span>{hue.toFixed(0)}°</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                step="1"
                                value={hue}
                                onChange={(e) => onHueChange(parseFloat(e.target.value))}
                                disabled={!hasImage}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)'
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tools Section */}
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold mb-3">Tools</h2>
                <div className="flex gap-2">
                    <button
                        className={clsx(
                            "p-2 rounded hover:bg-gray-700 transition-colors",
                            activeTool === 'select' && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => setActiveTool('select')}
                        title="Mark Loop"
                    >
                        <MousePointer2 className="w-6 h-6" />
                    </button>
                    <button
                        className={clsx(
                            "p-2 rounded hover:bg-gray-700 transition-colors",
                            activeTool === 'secondary' && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => setActiveTool('secondary')}
                        title="Mark Hemorrhage/Avascular"
                    >
                        <AlertCircle className="w-6 h-6" />
                    </button>
                    <button
                        className={clsx(
                            "p-2 rounded hover:bg-gray-700 transition-colors",
                            activeTool === 'roi' && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => setActiveTool('roi')}
                        title="Set Assessment Box (1mm×1mm)"
                    >
                        <div className="w-6 h-6 border-2 border-dashed border-current rounded-sm" />
                    </button>
                    <button
                        className={clsx(
                            "p-2 rounded hover:bg-gray-700 transition-colors",
                            activeTool === 'measure' && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => setActiveTool('measure')}
                        title="Ruler / Measure"
                    >
                        <Ruler className="w-6 h-6" />
                    </button>

                    <div className="w-px h-8 bg-gray-700 mx-1" />

                    <button
                        className="p-2 rounded bg-gray-700 opacity-50 cursor-not-allowed"
                        disabled={true}
                        title="Auto-Detect (Coming Soon)"
                    >
                        <Wand2 className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Morphology Selector */}
            {activeTool === 'select' && (
                <div className="p-4 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">Loop Morphology</h3>
                    <MorphologySelect
                        value={selectedMorphology}
                        onChange={onMorphologyChange}
                    />
                    <div className="mt-2 text-xs text-gray-400">
                        Markers will be colored by morphology type
                    </div>
                </div>
            )}

            {/* Secondary Selector */}
            {activeTool === 'secondary' && (
                <div className="p-4 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">Annotation Type</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSecondaryTypeChange('Hemorrhage')}
                            className={clsx(
                                "flex-1 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 border transition-colors",
                                selectedSecondaryType === 'Hemorrhage'
                                    ? "bg-red-900/50 border-red-500 text-white"
                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            )}
                        >
                            <div className="w-3 h-3 bg-[#991b1b] rotate-45" /> {/* Diamond */}
                            Hemorrhage
                        </button>
                        <button
                            onClick={() => onSecondaryTypeChange('Avascular')}
                            className={clsx(
                                "flex-1 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 border transition-colors",
                                selectedSecondaryType === 'Avascular'
                                    ? "bg-gray-600 border-gray-400 text-white"
                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            )}
                        >
                            <div className="w-3 h-3 bg-gray-500" /> {/* Square */}
                            Avascular
                        </button>
                    </div>
                </div>
            )}

            {/* Measurements Section */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="font-semibold mb-2 text-gray-400">Rulers ({rulers.length})</h3>
                <div className="space-y-2 mb-4">
                    {rulers.length === 0 && (
                        <p className="text-gray-500 text-sm italic">No rulers placed yet.</p>
                    )}
                    {rulers.map((ruler, index) => {
                        const length = Math.sqrt(
                            Math.pow(ruler.x2 - ruler.x1, 2) + Math.pow(ruler.y2 - ruler.y1, 2)
                        );
                        const lengthMicrons = length / scale;
                        return (
                            <div key={ruler.id} className="bg-gray-700 p-2 rounded text-sm flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span>Ruler #{index + 1}</span>
                                        <span className="text-blue-400">{lengthMicrons.toFixed(1)} µm</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteRuler(ruler.id)}
                                    className="ml-2 p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete ruler"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <h3 className="font-semibold mb-2 text-gray-400">Marked Loops ({loops.length})</h3>
                <div className="space-y-2 mb-4">
                    {loops.length === 0 && (
                        <p className="text-gray-500 text-sm italic">No loops marked yet.</p>
                    )}
                    {loops.map((loop, index) => (
                        <div
                            key={loop.id}
                            className="bg-gray-700 p-2 rounded text-sm hover:bg-gray-600 transition-colors cursor-default"
                            onMouseEnter={() => onHoverAnnotation(loop.id)}
                            onMouseLeave={() => onHoverAnnotation(null)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span>Loop #{index + 1}</span>
                                        <span className={clsx(
                                            "px-1.5 py-0.5 rounded text-xs",
                                            loop.isOutermost ? "bg-green-900 text-green-300" : "bg-gray-600 text-gray-300"
                                        )}>
                                            {loop.isOutermost ? "Outermost" : "Inner"}
                                        </span>
                                    </div>
                                    <div className="text-gray-400 mt-1">
                                        {loop.morphology}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteLoop(loop.id)}
                                    className="ml-2 p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete loop"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="font-semibold mb-2 text-gray-400">Other Annotations ({secondaries.length})</h3>
                <div className="space-y-2">
                    {secondaries.length === 0 && (
                        <p className="text-gray-500 text-sm italic">No other annotations.</p>
                    )}
                    {secondaries.map((s, index) => (
                        <div
                            key={s.id}
                            className="bg-gray-700 p-2 rounded text-sm flex items-center justify-between hover:bg-gray-600 transition-colors cursor-default"
                            onMouseEnter={() => onHoverAnnotation(s.id)}
                            onMouseLeave={() => onHoverAnnotation(null)}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={clsx(
                                        "w-3 h-3",
                                        s.type === 'Hemorrhage' ? "bg-[#991b1b] rotate-45" : "bg-gray-500"
                                    )}
                                />
                                <span>{s.type} #{index + 1}</span>
                            </div>
                            <button
                                onClick={() => onDeleteSecondary(s.id)}
                                className="ml-2 p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete annotation"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Export Section */}
            <div className="p-4 border-t border-gray-700 space-y-2">
                {/* Image Enhancement Toggle */}
                <button
                    onClick={onToggleEnhancement}
                    disabled={isEnhancing || !hasImage}
                    className={clsx(
                        "w-full flex items-center justify-center gap-2 py-2 px-4 rounded transition-colors text-sm font-medium",
                        isEnhancing || !hasImage
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : isEnhanced
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                >
                    {isEnhancing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    {isEnhancing ? 'Enhancing...' : isEnhanced ? 'Enhanced View' : 'Enhance Image'}
                </button>

                <button
                    onClick={onExport}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-sm"
                >
                    <Download className="w-4 h-4" />
                    Export JSON Data
                </button>
                <button
                    onClick={onExportImage}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors text-sm"
                >
                    <Download className="w-4 h-4" />
                    Export Annotated Image
                </button>
                {hasMultipleFiles && (
                    <button
                        onClick={onBatchPDFExport}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Batch PDF
                    </button>
                )}
            </div>
        </div>
    );
};
