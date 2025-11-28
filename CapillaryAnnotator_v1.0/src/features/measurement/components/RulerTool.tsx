import React, { useRef } from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import Konva from 'konva';

interface RulerToolProps {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    onChange: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
    scale: number; // Pixels per micron
}

export const RulerTool: React.FC<RulerToolProps> = ({ id, x1, y1, x2, y2, scale, onChange }) => {
    const groupRef = useRef<Konva.Group>(null);

    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const lengthMicrons = distance / scale;

    // Calculate text position at midpoint, offset perpendicular to the line
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Calculate angle of the ruler line for perpendicular endpoints and text offset
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Calculate perpendicular offset
    const offsetDistance = 35; // Distance from line
    const textX = midX + Math.cos(angle + Math.PI / 2) * offsetDistance;
    const textY = midY + Math.sin(angle + Math.PI / 2) * offsetDistance;

    return (
        <Group ref={groupRef}>
            {/* Line */}
            <Line
                points={[x1, y1, x2, y2]}
                stroke="#3b82f6"
                strokeWidth={2}
            />

            {/* Start point - Perpendicular line with invisible drag handle */}
            <Group
                x={x1}
                y={y1}
                draggable
                onDragMove={(e) => {
                    onChange(id, e.target.x(), e.target.y(), x2, y2);
                }}
            >
                {/* Invisible drag handle */}
                <Rect
                    x={-8}
                    y={-8}
                    width={16}
                    height={16}
                    fill="transparent"
                />
                {/* Perpendicular line */}
                <Line
                    points={[
                        -10 * Math.sin(angle),
                        10 * Math.cos(angle),
                        10 * Math.sin(angle),
                        -10 * Math.cos(angle)
                    ]}
                    stroke="#f97316"
                    strokeWidth={3}
                />
            </Group>

            {/* End point - Perpendicular line with invisible drag handle */}
            <Group
                x={x2}
                y={y2}
                draggable
                onDragMove={(e) => {
                    onChange(id, x1, y1, e.target.x(), e.target.y());
                }}
            >
                {/* Invisible drag handle */}
                <Rect
                    x={-8}
                    y={-8}
                    width={16}
                    height={16}
                    fill="transparent"
                />
                {/* Perpendicular line */}
                <Line
                    points={[
                        -10 * Math.sin(angle),
                        10 * Math.cos(angle),
                        10 * Math.sin(angle),
                        -10 * Math.cos(angle)
                    ]}
                    stroke="#f97316"
                    strokeWidth={3}
                />
            </Group>

            {/* Length label - positioned away from endpoints */}
            <Text
                x={textX}
                y={textY}
                text={`${lengthMicrons.toFixed(1)} µm`}
                fontSize={28}
                fill="white"
                stroke="black"
                strokeWidth={0.5}
                offsetX={30}
                offsetY={7}
            />
        </Group>
    );
};
