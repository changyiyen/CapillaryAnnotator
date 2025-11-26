import type { Loop, SecondaryAnnotation } from './types';

export const MORPHOLOGY_COLORS: Record<Loop['morphology'], string> = {
    'Normal': '#3b82f6',   // Blue
    'Tortuous': '#10b981', // Green
    'Enlarged': '#8b5cf6', // Purple
    'Giant': '#ec4899',    // Pink
    'Ramified': '#f59e0b', // Amber/Orange
    'Bizarre': '#ef4444'   // Red
};

export const SECONDARY_COLORS: Record<SecondaryAnnotation['type'], string> = {
    'Hemorrhage': '#991b1b', // Dark Red
    'Avascular': '#6b7280'   // Gray
};

export const MORPHOLOGY_OPTIONS: { value: Loop['morphology']; label: string; color: string }[] = [
    { value: 'Normal', label: 'Normal', color: MORPHOLOGY_COLORS.Normal },
    { value: 'Tortuous', label: 'Tortuous', color: MORPHOLOGY_COLORS.Tortuous },
    { value: 'Enlarged', label: 'Enlarged', color: MORPHOLOGY_COLORS.Enlarged },
    { value: 'Giant', label: 'Giant', color: MORPHOLOGY_COLORS.Giant },
    { value: 'Ramified', label: 'Ramified', color: MORPHOLOGY_COLORS.Ramified },
    { value: 'Bizarre', label: 'Bizarre', color: MORPHOLOGY_COLORS.Bizarre },
];
