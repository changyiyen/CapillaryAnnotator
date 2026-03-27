
// Standard fingers to report
export const FINGERS = ['R2', 'R3', 'R4', 'R5', 'L2', 'L3', 'L4', 'L5'] as const;
export type StandardFinger = typeof FINGERS[number];

export const parseFinger = (filename: string): StandardFinger | null => {
    // Regex to find R2-R5 or L2-L5 case insensitive
    // Matches "R2", "r2", "R 2", "Right 2", "Right2", "Right-2" etc.
    const regex = /([RL]|Right|Left)\s*[-_]?\s*([2-5])/i;
    const match = filename.match(regex);

    if (match) {
        let side = match[1].toUpperCase();
        const digit = match[2];

        // Normalize distinct 'Right'/'Left' to 'R'/'L'
        if (side.startsWith('R')) side = 'R';
        if (side.startsWith('L')) side = 'L';

        return `${side}${digit}` as StandardFinger;
    }
    return null;
};
