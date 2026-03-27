import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { Loop, RulerLine, SecondaryAnnotation, Polygon } from '../../../shared/types';
import { MORPHOLOGY_COLORS } from '../../../shared/constants';

interface AnnotationListProps {
    annotationMode: 'simple' | 'polygon';
    loops: Loop[];
    secondaries: SecondaryAnnotation[];
    rulers: RulerLine[];
    polygons: Polygon[];
    scale: number;
    onDeleteLoop: (id: string) => void;
    onDeleteSecondary: (id: string) => void;
    onDeleteRuler: (id: string) => void;
    onDeletePolygon: (id: string) => void;
    onHoverAnnotation: (id: string | null) => void;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
    annotationMode,
    loops,
    secondaries,
    rulers,
    polygons,
    scale,
    onDeleteLoop,
    onDeleteSecondary,
    onDeleteRuler,
    onDeletePolygon,
    onHoverAnnotation,
}) => {
    if (annotationMode === 'polygon') {
        return (
            <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 p-2 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-200">
                    <p className="font-semibold mb-0.5">Polygon Mode</p>
                    <p className="text-[10px] opacity-80">Click to add points. Click the first point to close the polygon.</p>
                </div>

                <h3 className="text-xs font-semibold mb-1 text-gray-400">Polygons ({polygons.length})</h3>
                <div className="space-y-1.5">
                    {polygons.length === 0 && (
                        <p className="text-gray-500 text-[10px] italic">No polygons drawn yet.</p>
                    )}
                    {polygons.map((poly, index) => {
                        const color = MORPHOLOGY_COLORS[poly.morphology] || MORPHOLOGY_COLORS.Normal;
                        return (
                            <div
                                key={poly.id}
                                className="bg-gray-700 p-1.5 rounded text-xs flex items-center justify-between hover:bg-gray-600 transition-colors cursor-default"
                                onMouseEnter={() => onHoverAnnotation(poly.id)}
                                onMouseLeave={() => onHoverAnnotation(null)}
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                    <span>{poly.morphology} #{index + 1}</span>
                                    <span className="text-[10px] text-gray-400">({poly.points.length} pts)</span>
                                </div>
                                <button
                                    onClick={() => onDeletePolygon(poly.id)}
                                    className="ml-2 p-0.5 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete polygon"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold mb-1 text-gray-400">Rulers ({rulers.length})</h3>
            <div className="space-y-1.5 mb-3">
                {rulers.length === 0 && (
                    <p className="text-gray-500 text-[10px] italic">No rulers placed yet.</p>
                )}
                {rulers.map((ruler, index) => {
                    const length = Math.sqrt(
                        Math.pow(ruler.x2 - ruler.x1, 2) + Math.pow(ruler.y2 - ruler.y1, 2)
                    );
                    const lengthMicrons = length / scale;
                    return (
                        <div key={ruler.id} className="bg-gray-700 p-1.5 rounded text-xs flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <span>Ruler #{index + 1}</span>
                                    <span className="text-blue-400">{lengthMicrons.toFixed(1)} µm</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onDeleteRuler(ruler.id)}
                                className="ml-2 p-0.5 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete ruler"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <h3 className="text-xs font-semibold mb-1 text-gray-400">Marked Loops ({loops.length})</h3>
            <div className="space-y-1.5 mb-3">
                {loops.length === 0 && (
                    <p className="text-gray-500 text-[10px] italic">No loops marked yet.</p>
                )}
                {loops.map((loop, index) => (
                    <div
                        key={loop.id}
                        className="bg-gray-700 p-1.5 rounded text-xs hover:bg-gray-600 transition-colors cursor-default"
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
                                className="ml-2 p-0.5 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete loop"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <h3 className="text-xs font-semibold mb-1 text-gray-400">Other Annotations ({secondaries.length})</h3>
            <div className="space-y-1.5">
                {secondaries.length === 0 && (
                    <p className="text-gray-500 text-[10px] italic">No other annotations.</p>
                )}
                {secondaries.map((s, index) => (
                    <div
                        key={s.id}
                        className="bg-gray-700 p-1.5 rounded text-xs flex items-center justify-between hover:bg-gray-600 transition-colors cursor-default"
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
                            className="ml-2 p-0.5 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete annotation"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
