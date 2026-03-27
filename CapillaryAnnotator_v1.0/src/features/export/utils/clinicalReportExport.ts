import { saveFile } from '../../../shared/utils/fileSaver';
import type { FileEntry } from '../../../shared/types';

import { type StandardFinger, FINGERS, parseFinger } from '../../../shared/utils/fingerParsing';

interface FingerStats {
    count: number;
    totalLoops: number;
    giant: number;
    enlarged: number;
    ramified: number;
    disorganized: number;
    hemorrhage: number;
}



const createEmptyStats = (): FingerStats => ({
    count: 0, totalLoops: 0, giant: 0, enlarged: 0, ramified: 0, disorganized: 0, hemorrhage: 0
});

export const generateClinicalReport = async (files: FileEntry[], patientId: string) => {
    const fingerGroups: Record<StandardFinger, FingerStats> = {
        R2: createEmptyStats(), R3: createEmptyStats(), R4: createEmptyStats(), R5: createEmptyStats(),
        L2: createEmptyStats(), L3: createEmptyStats(), L4: createEmptyStats(), L5: createEmptyStats(),
    };

    let totalAnnotatedImages = 0;
    let grandTotalLoops = 0;
    let anyGiant = false;
    let anyHemorrhage = false;
    let anyRamified = false;

    const annotFiles = files.filter(f => f.annotations && (f.annotations.loops.length > 0 || f.annotations.secondaries.length > 0 || f.annotations.roi));

    annotFiles.forEach(file => {
        totalAnnotatedImages++;
        const finger = parseFinger(file.filename);
        const loops = file.annotations!.loops;
        const secondaries = file.annotations!.secondaries || [];

        grandTotalLoops += loops.length;

        loops.forEach(l => {
            if (l.morphology === 'Giant') anyGiant = true;
            if (l.morphology === 'Ramified') anyRamified = true;
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

    // --- Logic for Cutolo Patterns ---
    const overallDensity = grandTotalLoops / totalAnnotatedImages;
    const isDensityReduced = overallDensity < 7;
    const isDensitySevereLoss = overallDensity < 4; // Arbitrary threshold for "Severe" (Late pattern)

    let pattern = "Normal / Non-specific Pattern";

    if (anyGiant) {
        if (!isDensityReduced) {
            pattern = "Scleroderma Pattern (Early) - Suggestive";
            // Early: Few giants, few hemorrhages, preserved density
        } else {
            pattern = "Scleroderma Pattern (Active) - Suggestive";
            // Active: Frequent giants, hemorrhages, moderate loss
        }
    } else if (isDensityReduced) {
        // No giants, but reduced density
        if (isDensitySevereLoss || anyRamified) {
            pattern = "Scleroderma Pattern (Late) - Suggestive";
            // Late: Severe loss, neoangiogenesis (ramified), few/no giants
        } else {
            pattern = "Non-specific Abnormalities (Reduced Density)";
        }
    } else if (anyHemorrhage && !anyGiant) {
        pattern = "Non-specific Abnormalities (Isolated Hemorrhages)";
    }


    // --- Build Report ---
    const lines: string[] = [];
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    lines.push('NAILFOLD CAPILLAROSCOPY REPORT');
    lines.push('==============================');
    lines.push(`Date: ${dateStr}`);
    lines.push(`Patient ID: ${patientId}`);
    lines.push('');
    lines.push('EXAMINATION DETAILS');
    lines.push('-------------------');
    lines.push('Method: Videocapillaroscopy (Standard 200x magnification assumed)');
    lines.push('Preparation: Standard protocol (Room temp 20-22°C)');
    lines.push('');
    lines.push('QUANTITATIVE FINDINGS (per finger)');
    lines.push('----------------------------------');

    const printFingerLine = (f: StandardFinger) => {
        const stats = fingerGroups[f];
        if (stats.count === 0) return; // Skip empty fingers for cleaner report? Or show "no data"?
        // Clinical reports usually show what WAS examined.

        const avg = (val: number) => (val / stats.count).toFixed(1);
        // Clinical report often wants precise decimals for averages

        lines.push(`Finger ${f}:`);
        lines.push(`  - Density: ${avg(stats.totalLoops)} loops/field (approx)`);
        if (stats.giant > 0) lines.push(`  - Giant loops: ${avg(stats.giant)} (avg)`);
        if (stats.hemorrhage > 0) lines.push(`  - Hemorrhages: ${avg(stats.hemorrhage)} (avg)`);
        if (stats.ramified > 0) lines.push(`  - Ramified/Bushy: ${avg(stats.ramified)} (avg)`);
        if (stats.enlarged > 0) lines.push(`  - Enlarged: ${avg(stats.enlarged)} (avg)`);
        lines.push('');
    };

    FINGERS.forEach(f => {
        if (fingerGroups[f].count > 0) printFingerLine(f);
    });

    lines.push('OVERALL ASSESSMENT');
    lines.push('------------------');
    lines.push(`Mean Capillary Density: ${overallDensity.toFixed(1)} loops/field`);
    lines.push(`Giant Capillaries: ${anyGiant ? 'Present' : 'Absent'}`);
    lines.push(`Microhemorrhages: ${anyHemorrhage ? 'Present' : 'Absent'}`);
    lines.push(`Neoangiogenesis (Ramified): ${anyRamified ? 'Present' : 'Absent'}`);
    lines.push('');
    lines.push('CONCLUSION / IMPRESSION');
    lines.push('-----------------------');
    lines.push(pattern);
    lines.push('');
    lines.push('Note: This automated report is suggestive only. Clinical correlation is required for diagnosis.');

    const content = lines.join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${patientId.replace(/[^a-zA-Z0-9_-]/g, '_')}_clinical_report_${timestamp}.txt`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    await saveFile(blob, filename, [{ description: 'Clinical Text Report', accept: { 'text/plain': ['.txt'] } }]);
};
