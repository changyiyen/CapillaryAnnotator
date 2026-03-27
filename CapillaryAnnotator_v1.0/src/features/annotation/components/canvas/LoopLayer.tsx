import React from 'react';
import { Circle } from 'react-konva';
import type { Loop } from '../../../../shared/types';
import { MORPHOLOGY_COLORS } from '../../../../shared/constants';

interface LoopLayerProps {
    loops: Loop[];
    hoveredAnnotationId: string | null;
    stageScale: number;
    activeTool: string;
    onLoopsChange: (loops: Loop[]) => void;
}

export const LoopLayer: React.FC<LoopLayerProps> = ({
    loops,
    hoveredAnnotationId,
    stageScale,
    activeTool,
    onLoopsChange,
}) => {
    return (
        <>
            {loops.map((loop) => (
                <Circle
                    key={loop.id}
                    x={loop.x}
                    y={loop.y}
                    radius={(hoveredAnnotationId === loop.id ? 8 : 5) / stageScale}
                    fill={MORPHOLOGY_COLORS[loop.morphology] || MORPHOLOGY_COLORS.Normal}
                    stroke={hoveredAnnotationId === loop.id ? "yellow" : "white"}
                    strokeWidth={(hoveredAnnotationId === loop.id ? 3 : 1) / stageScale}
                    shadowColor="black"
                    shadowBlur={hoveredAnnotationId === loop.id ? 10 : 0}
                    shadowOpacity={0.5}
                    draggable={activeTool === 'select'}
                    onDragEnd={(e) => {
                        const newLoops = loops.map(l =>
                            l.id === loop.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                        );
                        onLoopsChange(newLoops);
                    }}
                />
            ))}
        </>
    );
};
