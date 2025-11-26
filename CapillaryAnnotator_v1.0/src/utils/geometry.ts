import type { Loop } from '../types';

export const calculateAngle = (p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }): number => {
    // Calculate angle at p2 formed by p1-p2-p3
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};

export const updateLoopClassifications = (loops: Loop[]): Loop[] => {
    if (loops.length < 3) {
        // If fewer than 3 loops, can't really determine "between" loops.
        // Assume all are outermost?
        return loops.map(l => ({ ...l, isOutermost: true }));
    }

    // Sort by X coordinate
    const sortedLoops = [...loops].sort((a, b) => a.x - b.x);

    // Map back to original order if needed, but usually X-order is fine for display.
    // We'll return the sorted list or update the original objects.
    // Let's return a new list, sorted.

    return sortedLoops.map((loop, index) => {
        // Endpoints are always outermost
        if (index === 0 || index === sortedLoops.length - 1) {
            return { ...loop, isOutermost: true };
        }

        const prev = sortedLoops[index - 1];
        const next = sortedLoops[index + 1];

        // Check if retracted (y is larger than neighbors, since y increases downwards)
        // "Tips reaching from bottom to top" -> Top is y=0.
        // So "Tip" is the point with smallest y.
        // "Retracted" means the tip is lower down (larger y).
        const isRetracted = loop.y > prev.y && loop.y > next.y;

        if (!isRetracted) {
            return { ...loop, isOutermost: true };
        }

        // If retracted, check angle
        const angle = calculateAngle(prev, loop, next);

        // If angle > 90, it's outermost
        return { ...loop, isOutermost: angle > 90 };
    });
};
