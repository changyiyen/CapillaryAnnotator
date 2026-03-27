import React, { useState } from 'react';
import { RotateCw, ChevronDown, ChevronRight, Loader2, Wand2, SlidersHorizontal, Sun, CircleDot, Palette } from 'lucide-react';

interface ImageControlsProps {
    rotation: number;
    onRotationChange: (rotation: number) => void;
    onAutoAlign: () => void;
    isAligning: boolean;
    hasImage: boolean;
    brightness: number;
    onBrightnessChange: (val: number) => void;
    contrast: number;
    onContrastChange: (val: number) => void;
    hue: number;
    onHueChange: (val: number) => void;
}

export const ImageControls: React.FC<ImageControlsProps> = ({
    rotation,
    onRotationChange,
    onAutoAlign,
    isAligning,
    hasImage,
    brightness,
    onBrightnessChange,
    contrast,
    onContrastChange,
    hue,
    onHueChange
}) => {
    const [isRotationOpen, setIsRotationOpen] = useState(false);
    const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);

    return (
        <>
            {/* Image Rotation Section */}
            <div className="border-b border-gray-700">
                <button
                    onClick={() => setIsRotationOpen(!isRotationOpen)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                    <h3 className="text-xs font-semibold text-gray-400 flex items-center gap-2">
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
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
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
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                    <h3 className="text-xs font-semibold text-gray-400 flex items-center gap-2">
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
                    <div className="px-3 pb-3 space-y-3">
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
                            <div className="flex justify-between text-[10px] text-gray-500">
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
                            <div className="flex justify-between text-[10px] text-gray-500">
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
                            <div className="flex justify-between text-[10px] text-gray-500">
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
        </>
    );
};
