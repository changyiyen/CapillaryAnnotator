import { saveFile } from '../../../shared/utils/fileSaver';
import type { FileEntry } from '../../../shared/types';

import { type StandardFinger, FINGERS, parseFinger } from '../../../shared/utils/fingerParsing';

interface FingerStats {
    count: number; // Number of images for this finger
    totalLoops: number;
    giant: number;
    enlarged: number;
    ramified: number;
    disorganized: number; // Tortuous + Bizarre
    hemorrhage: number;
    avascular: number;
}



export const generateTextReport = async (files: FileEntry[], patientId: string) => {
    // 1. Group Data by Finger
    const fingerGroups: Record<StandardFinger, FingerStats> = {
        R2: createEmptyStats(), R3: createEmptyStats(), R4: createEmptyStats(), R5: createEmptyStats(),
        L2: createEmptyStats(), L3: createEmptyStats(), L4: createEmptyStats(), L5: createEmptyStats(),
    };

    let totalAnnotatedImages = 0;
    let grandTotalLoops = 0;
    let anyGiant = false;
    let anyHemorrhage = false;

    // We only care about annotated files
    const annotFiles = files.filter(f => f.annotations && (f.annotations.loops.length > 0 || f.annotations.secondaries.length > 0 || f.annotations.roi));

    annotFiles.forEach(file => {
        totalAnnotatedImages++;
        const finger = parseFinger(file.filename);

        // Even if finger is null (unknown), we track global stats for density
        const loops = file.annotations!.loops;
        const secondaries = file.annotations!.secondaries || [];

        grandTotalLoops += loops.length;

        loops.forEach(l => {
            if (l.morphology === 'Giant') anyGiant = true;
        });
        secondaries.forEach(s => {
            if (s.type === 'Hemorrhage') anyHemorrhage = true;
        });

        if (finger) {
            const stats = fingerGroups[finger];
            stats.count++;
            stats.totalLoops += loops.length;
            stats.giant += loops.filter(l => l.morphology === 'Giant').length;
            stats.enlarged += loops.filter(l => l.morphology === 'Enlarged').length;
            stats.ramified += loops.filter(l => l.morphology === 'Ramified').length;
            stats.disorganized += loops.filter(l => ['Tortuous', 'Bizarre'].includes(l.morphology)).length;
            stats.hemorrhage += secondaries.filter(s => s.type === 'Hemorrhage').length;
        }
    });

    if (totalAnnotatedImages === 0) {
        alert("No annotated images found.");
        return;
    }

    // 2. Build Report Content
    const lines: string[] = [];
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); // e.g., Dec 28, 2024

    // Header
    lines.push(`Date: ${dateStr}; Patient ID: ${patientId}`);
    lines.push(''); // Blank line

    // Hand Sections
    const printFingerLine = (f: StandardFinger) => {
        const stats = fingerGroups[f];
        if (stats.count === 0) {
            lines.push(`${f}: (no data)`);
            return;
        }

        const avg = (val: number) => Math.ceil(val / stats.count);

        const parts: string[] = [];
        parts.push(`${avg(stats.totalLoops)} capillaries`); // Average capillary count

        const giant = avg(stats.giant);
        if (giant > 0) parts.push(`${giant} giant loops`);

        const enlarged = avg(stats.enlarged);
        if (enlarged > 0) parts.push(`${enlarged} enlarged loops`);

        const ramified = avg(stats.ramified);
        if (ramified > 0) parts.push(`${ramified} ramified loops`);

        const disorg = avg(stats.disorganized);
        if (disorg > 0) parts.push(`${disorg} disorganized loops`);

        lines.push(`${f}: ${parts.join(', ')}`);
    };

    // Right Hand
    lines.push('Right hand:');
    ['R2', 'R3', 'R4', 'R5'].forEach(f => printFingerLine(f as StandardFinger));

    // Left Hand
    lines.push('Left hand:');
    ['L2', 'L3', 'L4', 'L5'].forEach(f => printFingerLine(f as StandardFinger));

    lines.push(''); // Spacing

    // 3. Other findings
    lines.push('Other findings:');

    // Overall density
    const overallDensity = grandTotalLoops / totalAnnotatedImages;
    // Format to 1 decimal place usually? Prompt implies just checking threshold. 
    // "Overall capillary density... followed by a comma"
    // Example in prompt isn't visible but described. Just print the number.
    const densityStr = overallDensity.toFixed(1); // Reasonable default
    const decreasedStr = overallDensity < 7 ? 'decreased' : 'not decreased';
    lines.push(`- Overall capillary density ${densityStr}, ${decreasedStr}`);

    // Giant capillary count
    lines.push(`- Capillary diameter > 50uM (giant capillary): ${anyGiant ? 'yes' : 'no'}`);

    // Hemorrhage
    lines.push(`- Hemorrhage: ${anyHemorrhage ? 'yes' : 'no'}`);

    lines.push(''); // Spacing

    // 4. Impression
    lines.push('Impression:');

    // Scleroderma Pattern Logic
    // Condition 1: Giant loops on > 1 finger
    let distinctFingersWithGiant = 0;
    Object.keys(fingerGroups).forEach(key => {
        const f = key as StandardFinger;
        // Check if stats.giant > 0? No, stats.giant is the sum.
        // Wait, "Giant loops on > 1 finger". 
        // If *any* image for that finger has giant loop? Or if average > 0?
        // Since we aggregate sums, if sums > 0, then at least one loop existed.
        if (fingerGroups[f].giant > 0) distinctFingersWithGiant++;
    });

    // Condition 2: Decreased overall density
    const isDecreased = overallDensity < 7;

    if (distinctFingersWithGiant > 1 && isDecreased) {
        lines.push('Scleroderma pattern');
    } else {
        lines.push('[ Non-scleroderma | Scleroderma ] pattern');
    }

    lines.push(''); // Spacing

    // 5. Non-specific abnormalities
    lines.push('Non-specific abnormalities:');

    // Hemorrhage list
    const hemoFingers = FINGERS.filter(f => fingerGroups[f].hemorrhage > 0);
    if (hemoFingers.length > 0) {
        lines.push(`- hemorrhage in ${hemoFingers.join(', ')}`);
    }

    // Ectasic (Enlarged) list
    // Assuming "ectasic capillaries (<50uM)" maps to 'Enlarged' morphology which is <50um but >20um usually. 
    // Giant is >50um.
    const enlargedFingers = FINGERS.filter(f => fingerGroups[f].enlarged > 0);
    if (enlargedFingers.length > 0) {
        lines.push(`- ectasic capillaries (<50uM) in ${enlargedFingers.join(', ')}`);
    }

    // Join with newlines (Windows EOL)
    const content = lines.join('\r\n');

    // Save
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${patientId.replace(/[^a-zA-Z0-9_-]/g, '_')}_report_${timestamp}.txt`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    await saveFile(blob, filename, [{ description: 'Text Report', accept: { 'text/plain': ['.txt'] } }]);
};

function createEmptyStats(): FingerStats {
    return { count: 0, totalLoops: 0, giant: 0, enlarged: 0, ramified: 0, disorganized: 0, hemorrhage: 0, avascular: 0 };
}
