import React from 'react';
import { Rect } from 'react-konva';
import type { SecondaryAnnotation } from '../../../../shared/types';

interface SecondaryLayerProps {
    secondaries: SecondaryAnnotation[];
    hoveredAnnotationId: string | null;
    stageScale: number;
    activeTool: string;
    onSecondariesChange: (secondaries: SecondaryAnnotation[]) => void;
}

export const SecondaryLayer: React.FC<SecondaryLayerProps> = ({
    secondaries,
    hoveredAnnotationId,
    stageScale,
    activeTool,
    onSecondariesChange,
}) => {
    return (
        <>
            {secondaries.map((s) => {
                const isHovered = hoveredAnnotationId === s.id;
                const size = isHovered ? 16 : 12;
                const offset = size / 2;

                return (
                    <Rect
                        key={s.id}
                        x={s.x}
                        y={s.y}
                        width={size / stageScale}
                        height={size / stageScale}
                        offsetX={offset / stageScale}
                        offsetY={offset / stageScale}
                        fill={s.type === 'Hemorrhage' ? '#991b1b' : '#6b7280'}
                        rotation={s.type === 'Hemorrhage' ? 45 : 0}
                        stroke={isHovered ? "yellow" : "white"}
                        strokeWidth={(isHovered ? 2 : 1) / stageScale}
                        draggable={activeTool === 'secondary'}
                        onDragEnd={(e) => {
                            const newSecondaries = secondaries.map(sec =>
                                sec.id === s.id ? { ...sec, x: e.target.x(), y: e.target.y() } : sec
                            );
                            onSecondariesChange(newSecondaries);
                        }}
                    />
                );
            })}
        </>
    );
};
