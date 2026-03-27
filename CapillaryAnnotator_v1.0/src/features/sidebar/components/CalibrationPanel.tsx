import React, { useState } from 'react';
import { Ruler, ChevronDown, ChevronRight } from 'lucide-react';

interface CalibrationPanelProps {
    scale: number;
    onScaleChange: (scale: number) => void;
}

export const CalibrationPanel: React.FC<CalibrationPanelProps> = ({
    scale,
    onScaleChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
                <h3 className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Calibration
                </h3>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>

            {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                    <label className="text-xs text-gray-400">Pixels per Micron (µm)</label>
                    <input
                        type="number"
                        value={scale}
                        onChange={(e) => onScaleChange(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                        step="0.1"
                        min="0.1"
                    />
                    <p className="text-[10px] text-gray-500">
                        1 mm assessment box = {(1000 * scale).toFixed(0)} pixels
                    </p>
                </div>
            )}
        </div>
    );
};
