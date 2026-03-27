import React from 'react';
import { Circle } from 'react-konva';
import { RulerTool } from '../../../measurement/components/RulerTool';
import type { RulerLine } from '../../../../shared/types';

interface RulerLayerProps {
    rulers: RulerLine[];
    scale: number;
    stageScale: number;
    activeTool: string;
    rulerStart: { x: number; y: number } | null;
    onRulersChange: (rulers: RulerLine[]) => void;
}

export const RulerLayer: React.FC<RulerLayerProps> = ({
    rulers,
    scale,
    stageScale,
    activeTool,
    rulerStart,
    onRulersChange,
}) => {
    return (
        <>
            {rulers.map((ruler) => (
                <RulerTool
                    key={ruler.id}
                    {...ruler}
                    scale={scale}
                    onChange={(id, x1, y1, x2, y2) => {
                        const newRulers = rulers.map(r =>
                            r.id === id ? { ...r, x1, y1, x2, y2 } : r
                        );
                        onRulersChange(newRulers);
                    }}
                />
            ))}

            {rulerStart && activeTool === 'measure' && (
                <Circle
                    x={rulerStart.x}
                    y={rulerStart.y}
                    radius={6 / stageScale}
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth={2 / stageScale}
                />
            )}
        </>
    );
};
