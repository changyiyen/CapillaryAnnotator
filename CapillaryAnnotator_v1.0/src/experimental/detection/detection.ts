import type { Loop } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Configuration for detection
const CONFIG = {
    // Image processing
    resizeWidth: 800, // Process at lower resolution for speed

    // Thresholding
    windowSize: 15, // Adaptive threshold window
    c: 2, // Adaptive threshold constant

    // Blob filtering (relative to resized image)
    minArea: 100, // INCREASED: Ignore small noise (was 20)
    maxArea: 2000, // INCREASED: Allow larger loops
    minAspectRatio: 1.5, // Capillaries are elongated
    minSolidity: 0.6, // INCREASED: Must be solid shapes (was 0.5)

    // Outermost logic
    columnWidth: 50, // Width of columns for skyline algorithm (in resized px)
};

/**
 * Main detection function
 */
export const detectLoops = async (
    imageElement: HTMLImageElement,
    _scale: number // Pixels per micron (unused for now, but kept for interface)
): Promise<Loop[]> => {
    return new Promise((resolve) => {
        // Run in next tick to avoid blocking UI immediately
        setTimeout(() => {
            const loops = processImage(imageElement, _scale);
            resolve(loops);
        }, 0);
    });
};

const processImage = (img: HTMLImageElement, _scale: number): Loop[] => {
    // 1. Setup Canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Resize for processing speed
    const ratio = CONFIG.resizeWidth / img.width;
    const width = CONFIG.resizeWidth;
    const height = Math.round(img.height * ratio);

    canvas.width = width;
    canvas.height = height;

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 2. Grayscale & Contrast Enhancement
    const gray = toGrayscale(data, width, height);

    // 3. Adaptive Thresholding
    // Detect dark structures on lighter background
    const binary = adaptiveThreshold(gray, width, height);

    // 4. Morphological Opening (Erosion then Dilation)
    // Removes small noise
    const opened = morphologyOpen(binary, width, height);

    // 5. Connected Components Labeling
    const { labels, count } = connectedComponents(opened, width, height);

    // 6. Blob Analysis & Initial Filtering
    const candidates: BlobStats[] = [];

    for (let i = 1; i <= count; i++) {
        const blob = analyzeBlob(labels, i, width, height);
        if (isValidLoop(blob)) {
            candidates.push(blob);
        }
    }

    // 7. "Outermost" Filtering (Skyline Algorithm)
    // Since image is "upside-down", outermost = Max Y (bottom of image)
    const outermostBlobs = filterOutermost(candidates, width);

    // 8. Convert to Loops
    const detectedLoops: Loop[] = outermostBlobs.map(blob => ({
        id: uuidv4(),
        x: blob.centerX / ratio,
        y: blob.centerY / ratio,
        morphology: 'Normal',
        diameter: 0,
        isOutermost: true
    }));

    return detectedLoops;
};

// --- Skyline Algorithm for Outermost Loops ---

const filterOutermost = (blobs: BlobStats[], imageWidth: number): BlobStats[] => {
    if (blobs.length === 0) return [];

    // Divide image into vertical columns
    const numColumns = Math.ceil(imageWidth / CONFIG.columnWidth);
    const skyline: (BlobStats | null)[] = new Array(numColumns).fill(null);

    // For each column, find the blob with the MAXIMUM Y (bottom-most)
    blobs.forEach(blob => {
        const colIndex = Math.floor(blob.centerX / CONFIG.columnWidth);
        if (colIndex >= 0 && colIndex < numColumns) {
            const currentBest = skyline[colIndex];

            // Heuristic: "Upside-down" image -> Outermost is at the BOTTOM (Max Y)
            if (!currentBest || blob.centerY > currentBest.centerY) {
                skyline[colIndex] = blob;
            }
        }
    });

    // Filter out nulls
    return skyline.filter((b): b is BlobStats => b !== null);
};

// --- Image Processing Helpers ---

const toGrayscale = (data: Uint8ClampedArray, width: number, height: number): Uint8Array => {
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        // Standard luminance formula: 0.299R + 0.587G + 0.114B
        // Inverting because capillaries are dark on light background
        // We want capillaries to be bright for processing
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[i / 4] = 255 - luminance;
    }
    return gray;
};

const adaptiveThreshold = (gray: Uint8Array, width: number, height: number): Uint8Array => {
    const binary = new Uint8Array(width * height);
    const w = CONFIG.windowSize;
    const offset = Math.floor(w / 2);

    // Integral image for fast local mean calculation
    const integral = new Uint32Array(width * height);

    // Compute integral image
    for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let x = 0; x < width; x++) {
            sum += gray[y * width + x];
            if (y === 0) {
                integral[y * width + x] = sum;
            } else {
                integral[y * width + x] = sum + integral[(y - 1) * width + x];
            }
        }
    }

    const getSum = (x1: number, y1: number, x2: number, y2: number) => {
        x1 = Math.max(0, x1); y1 = Math.max(0, y1);
        x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);

        const A = integral[y2 * width + x2];
        const B = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
        const C = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
        const D = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;

        return A - B - C + D;
    };

    // Apply threshold
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = x - offset;
            const y1 = y - offset;
            const x2 = x + offset;
            const y2 = y + offset;

            const count = (Math.min(width - 1, x2) - Math.max(0, x1) + 1) *
                (Math.min(height - 1, y2) - Math.max(0, y1) + 1);

            const sum = getSum(x1, y1, x2, y2);
            const mean = sum / count;

            if (gray[y * width + x] > mean + CONFIG.c) {
                binary[y * width + x] = 1;
            } else {
                binary[y * width + x] = 0;
            }
        }
    }

    return binary;
};

const morphologyOpen = (binary: Uint8Array, width: number, height: number): Uint8Array => {
    // Erosion then Dilation
    const eroded = new Uint8Array(width * height);
    const dilated = new Uint8Array(width * height);

    // Simple 3x3 cross kernel
    // Erosion
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (binary[idx] &&
                binary[idx - 1] && binary[idx + 1] &&
                binary[idx - width] && binary[idx + width]) {
                eroded[idx] = 1;
            }
        }
    }

    // Dilation
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (eroded[idx] ||
                eroded[idx - 1] || eroded[idx + 1] ||
                eroded[idx - width] || eroded[idx + width]) {
                dilated[idx] = 1;
            }
        }
    }

    return dilated;
};

const connectedComponents = (binary: Uint8Array, width: number, height: number) => {
    const labels = new Int32Array(width * height);
    let currentLabel = 0;
    const parent: number[] = [0]; // Union-find structure

    const find = (i: number): number => {
        while (i !== parent[i]) i = parent[i];
        return i;
    };

    const union = (i: number, j: number) => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootJ] = rootI;
    };

    // First pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (binary[y * width + x] === 0) continue;

            const left = x > 0 ? labels[y * width + (x - 1)] : 0;
            const top = y > 0 ? labels[(y - 1) * width + x] : 0;

            if (left === 0 && top === 0) {
                currentLabel++;
                parent.push(currentLabel);
                labels[y * width + x] = currentLabel;
            } else if (left !== 0 && top === 0) {
                labels[y * width + x] = left;
            } else if (left === 0 && top !== 0) {
                labels[y * width + x] = top;
            } else {
                labels[y * width + x] = Math.min(left, top);
                union(left, top);
            }
        }
    }

    // Second pass - resolve labels
    for (let i = 0; i < labels.length; i++) {
        if (labels[i] > 0) {
            labels[i] = find(labels[i]);
        }
    }

    return { labels, count: currentLabel };
};

interface BlobStats {
    area: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    centerX: number;
    centerY: number;
}

const analyzeBlob = (labels: Int32Array, label: number, width: number, height: number): BlobStats => {
    let area = 0;
    let minX = width, maxX = 0;
    let minY = height, maxY = 0;
    let sumX = 0, sumY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (labels[y * width + x] === label) {
                area++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                sumX += x;
                sumY += y;
            }
        }
    }

    return {
        area,
        minX, maxX,
        minY, maxY,
        centerX: area > 0 ? sumX / area : 0,
        centerY: area > 0 ? sumY / area : 0
    };
};

const isValidLoop = (blob: BlobStats): boolean => {
    if (blob.area < CONFIG.minArea || blob.area > CONFIG.maxArea) return false;

    const width = blob.maxX - blob.minX + 1;
    const height = blob.maxY - blob.minY + 1;
    const aspectRatio = height / width;

    // Capillaries are typically elongated vertically
    if (aspectRatio < CONFIG.minAspectRatio) return false;

    // Solidity check (area / bounding box area)
    const bboxArea = width * height;
    const solidity = blob.area / bboxArea;
    if (solidity < CONFIG.minSolidity) return false;

    return true;
};
