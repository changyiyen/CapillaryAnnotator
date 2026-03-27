import React from 'react';
import type { Loop, SecondaryAnnotation } from '../../../shared/types';
import { MORPHOLOGY_COLORS } from '../../../shared/constants';

// Define inline types for stats since they're internal to this component
type MorphologyStats = Record<Loop['morphology'], number>;
type SecondaryStats = Record<SecondaryAnnotation['type'], number>;

interface MorphologyTallyProps {
    loops: Loop[];
    secondaries: SecondaryAnnotation[];
}

const getMorphologyColor = (morphology: Loop['morphology']): string => {
    return MORPHOLOGY_COLORS[morphology];
};

export const MorphologyTally: React.FC<MorphologyTallyProps> = ({ loops, secondaries }) => {
    const stats: MorphologyStats = {
        Normal: 0,
        Tortuous: 0,
        Enlarged: 0,
        Giant: 0,
        Ramified: 0,
        Bizarre: 0
    };

    loops.forEach(loop => {
        stats[loop.morphology]++;
    });

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    const secondaryStats: SecondaryStats = {
        Hemorrhage: 0,
        Avascular: 0
    };

    secondaries.forEach(s => {
        secondaryStats[s.type]++;
    });

    const morphologies: Array<keyof MorphologyStats> = [
        'Normal',
        'Tortuous',
        'Enlarged',
        'Giant',
        'Ramified',
        'Bizarre'
    ];

    return (
        <div className="w-48 bg-gray-800 border-r border-gray-700 p-2 flex flex-col h-full overflow-hidden">
            <h3 className="text-xs font-bold mb-2 text-gray-300 flex-shrink-0">Morphology Counts</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-1">
                    {morphologies.map(morphology => (
                        <div
                            key={morphology}
                            className="flex items-center justify-between text-[11px] py-0.5"
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full border border-white"
                                    style={{ backgroundColor: getMorphologyColor(morphology) }}
                                />
                                <span className="text-gray-300">{morphology}</span>
                            </div>
                            <span className="text-white font-mono">{stats[morphology]}</span>
                        </div>
                    ))}
                    <div className="border-t border-gray-600 mt-2 pt-2 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-gray-300">Total Loops</span>
                        <span className="text-white font-mono">{total}</span>
                    </div>
                </div>

                <h3 className="text-xs font-bold mt-4 mb-2 text-gray-300">Other Findings</h3>
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] py-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-[#991b1b] rotate-45" />
                            <span className="text-gray-300">Hemorrhage</span>
                        </div>
                        <span className="text-white font-mono">{secondaryStats.Hemorrhage}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] py-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-gray-500" />
                            <span className="text-gray-300">Avascular</span>
                        </div>
                        <span className="text-white font-mono">{secondaryStats.Avascular}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
