import type { Loop } from '../../../shared/types';

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
        // If fewer than 3 loops, all are considered outermost.
        return loops.map(l => ({ ...l, isOutermost: true }));
    }

    // Sort by X coordinate to calculate neighborhood, but don't change the original order
    const sortedLoops = [...loops].sort((a, b) => a.x - b.x);
    const classifications = new Map<string, boolean>();

    sortedLoops.forEach((loop, index) => {
        // Endpoints of the row are always outermost
        if (index === 0 || index === sortedLoops.length - 1) {
            classifications.set(loop.id, true);
            return;
        }

        const prev = sortedLoops[index - 1];
        const next = sortedLoops[index + 1];

        // Tip is the point with smallest y (top). Retracted = larger y (bottom).
        const isRetracted = loop.y > prev.y && loop.y > next.y;

        if (!isRetracted) {
            classifications.set(loop.id, true);
        } else {
            // If retracted, check angle; if > 90 degrees, it's still outermost
            const angle = calculateAngle(prev, loop, next);
            classifications.set(loop.id, angle > 90);
        }
    });

    // Map classifications back to the original array to maintain Z-index and order stability
    return loops.map(loop => ({
        ...loop,
        isOutermost: classifications.get(loop.id) ?? true
    }));
};
