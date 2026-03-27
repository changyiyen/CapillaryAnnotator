/**
 * Deskewing Utility for Capillaroscopy Images
 * 
 * Uses projection profile analysis (Radon transform-like approach) to detect
 * the orientation of capillaries and align the row horizontally.
 */

/**
 * Calculates the skew angle of the image to align vertical structures (capillaries)
 * perpendicular to the horizontal axis.
 * 
 * @param image The source image element
 * @returns The angle in degrees to rotate the image (counter-clockwise)
 */
export async function calculateSkewAngle(image: HTMLImageElement): Promise<number> {
    return new Promise((resolve, reject) => {
        try {
            // 1. Downsample for performance
            const maxDim = 512;
            const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
            const width = Math.floor(image.width * scale);
            const height = Math.floor(image.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(image, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // 2. Edge Detection (Sobel) to highlight structures
            // We only care about vertical edges, so we emphasize X-gradient
            const edges = new Uint8Array(width * height);
            const gray = new Uint8Array(width * height);

            // Convert to grayscale first
            for (let i = 0; i < width * height; i++) {
                gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
            }

            // Apply Sobel X filter
            // [-1 0 1]
            // [-2 0 2]
            // [-1 0 1]
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const i = y * width + x;
                    const gx =
                        (-1 * gray[i - width - 1]) + (1 * gray[i - width + 1]) +
                        (-2 * gray[i - 1]) + (2 * gray[i + 1]) +
                        (-1 * gray[i + width - 1]) + (1 * gray[i + width + 1]);

                    edges[i] = Math.min(255, Math.abs(gx));
                }
            }

            // 3. Sweep angles and calculate projection variance
            // Capillaries are vertical, so we look for the angle that makes them MOST vertical.
            // When vertical, the vertical projection (sum of columns) will have maximum variance
            // (peaks at vessels, valleys between them).

            let bestAngle = 0;
            let maxVariance = -1;

            // Search range: -20 to +20 degrees
            // Step 1: Coarse search (1 degree steps)
            for (let angle = -20; angle <= 20; angle += 1) {
                const variance = calculateProjectionVariance(edges, width, height, angle);
                if (variance > maxVariance) {
                    maxVariance = variance;
                    bestAngle = angle;
                }
            }

            // Step 2: Fine search (0.1 degree steps around best coarse angle)
            const coarseBest = bestAngle;
            for (let angle = coarseBest - 1; angle <= coarseBest + 1; angle += 0.1) {
                const variance = calculateProjectionVariance(edges, width, height, angle);
                if (variance > maxVariance) {
                    maxVariance = variance;
                    bestAngle = angle;
                }
            }

            resolve(bestAngle);

        } catch (error) {
            reject(error);
        }
    });
}

function calculateProjectionVariance(
    pixels: Uint8Array,
    width: number,
    height: number,
    angleDeg: number
): number {
    const angleRad = (angleDeg * Math.PI) / 180;
    const sin = Math.sin(angleRad);
    const cos = Math.cos(angleRad);

    // To project vertically, we iterate through "columns" of the rotated image.
    // However, rotating the image is expensive. Instead, we map rotated coordinates back to source.

    // Determine bounds of rotated image
    // We only care about the central strip to avoid edge artifacts
    const centerW = width / 2;
    const centerH = height / 2;

    const projection = new Float64Array(width);
    const counts = new Uint32Array(width);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Rotate point (x,y) around center by -angle to align it
            // x' = (x-cx)cos - (y-cy)sin + cx

            const dx = x - centerW;
            const dy = y - centerH;

            // We project onto the X axis (summing along Y)
            // The x-coordinate in the rotated space:
            const rotX = dx * cos - dy * sin + centerW;

            const bin = Math.floor(rotX);
            if (bin >= 0 && bin < width) {
                projection[bin] += pixels[y * width + x];
                counts[bin]++;
            }
        }
    }

    // Normalize projection
    let sum = 0;
    let sumSq = 0;
    let n = 0;

    for (let i = 0; i < width; i++) {
        if (counts[i] > 0) {
            const val = projection[i] / counts[i];
            sum += val;
            sumSq += val * val;
            n++;
        }
    }

    if (n === 0) return 0;

    const mean = sum / n;
    const variance = (sumSq / n) - (mean * mean);

    return variance;
}
