import React from 'react';
import { Group, Line, Circle } from 'react-konva';
import type { Polygon } from '../../../../shared/types';
import { MORPHOLOGY_COLORS } from '../../../../shared/constants';

interface PolygonLayerProps {
    polygons: Polygon[];
    activePolygon: Polygon | null;
    stageScale: number;
    isHoveringStartPoint: boolean;
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({
    polygons,
    activePolygon,
    stageScale,
    isHoveringStartPoint,
}) => {
    return (
        <>
            {/* Existing Polygons */}
            {polygons.map((poly) => {
                const color = MORPHOLOGY_COLORS[poly.morphology] || MORPHOLOGY_COLORS.Normal;
                return (
                    <Group key={poly.id}>
                        <Line
                            points={poly.points.flatMap(p => [p.x, p.y])}
                            closed={poly.isClosed}
                            stroke={color}
                            strokeWidth={2 / stageScale}
                            fill={`${color}33`} // Add transparency to fill (20% opacity)
                            lineJoin="round"
                        />
                        {poly.points.map((p, i) => (
                            <Circle
                                key={i}
                                x={p.x}
                                y={p.y}
                                radius={3 / stageScale}
                                fill={color}
                            />
                        ))}
                    </Group>
                );
            })}

            {/* Active Polygon (Being drawn) */}
            {activePolygon && (
                <Group>
                    <Line
                        points={activePolygon.points.flatMap(p => [p.x, p.y])}
                        stroke={MORPHOLOGY_COLORS[activePolygon.morphology] || MORPHOLOGY_COLORS.Normal}
                        strokeWidth={2 / stageScale}
                        dash={[5 / stageScale, 5 / stageScale]}
                        lineJoin="round"
                    />
                    {activePolygon.points.map((p, i) => {
                        const isStartPoint = i === 0;
                        const isHighlightingStart = isStartPoint && isHoveringStartPoint;

                        return (
                            <Circle
                                key={i}
                                x={p.x}
                                y={p.y}
                                radius={(isHighlightingStart ? 8 : 4) / stageScale}
                                fill={isStartPoint ? (isHighlightingStart ? "#4ade80" : "#22c55e") : "#d8b4fe"} // Bright green if hovering start
                                stroke={isHighlightingStart ? "white" : "white"}
                                strokeWidth={(isHighlightingStart ? 3 : 1) / stageScale}
                                shadowColor={isHighlightingStart ? "#4ade80" : "transparent"}
                                shadowBlur={isHighlightingStart ? 10 : 0}
                            />
                        );
                    })}
                </Group>
            )}
        </>
    );
};
