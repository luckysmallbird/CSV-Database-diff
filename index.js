const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const ejs = require('ejs');

const oldDir = process.argv[2];
const newDir = process.argv[3];
const outFile = process.argv[4] || 'report.html';

if (!oldDir || !newDir) {
    console.error("Usage: node index.js <old_directory> <new_directory> [output_file.html]");
    process.exit(1);
}

// Recursively get all CSV files and map their basename to their full path
const getCsvFiles = (dir) => {
    let results = {};
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            const subResults = getCsvFiles(filePath);
            results = { ...results, ...subResults };
        } else if (file.endsWith('.csv')) {
            results[file] = filePath;
        }
    });
    return results;
};

// Extract date from folder name like vpa-dev-pvpa-20260908
const extractDateFromDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return 'Unknown';
    const subdirs = fs.readdirSync(dirPath);
    for (const subdir of subdirs) {
        const match = subdir.match(/vpa-dev-pvpa-(\d{8})/);
        if (match) return match[1];
    }
    return 'Unknown';
};

const oldDate = extractDateFromDir(oldDir);
const newDate = extractDateFromDir(newDir);

const oldFilesMap = getCsvFiles(oldDir);
const newFilesMap = getCsvFiles(newDir);
const allFiles = Array.from(new Set([...Object.keys(oldFilesMap), ...Object.keys(newFilesMap)])).sort();

const reports = [];
let totalAdded = 0;
let totalRemoved = 0;
let totalChangedTables = 0;

allFiles.forEach(file => {
    const oldPath = oldFilesMap[file];
    const newPath = newFilesMap[file];
    
    let oldRows = [];
    let newRows = [];
    let headers = [];

    // Parse Old CSV
    if (oldPath && fs.existsSync(oldPath)) {
        const content = fs.readFileSync(oldPath, 'utf8');
        const parsed = parse(content, { skip_empty_lines: true });
        if (parsed.length > 0) {
            headers = parsed[0];
            oldRows = parsed.slice(1);
        }
    }

    // Parse New CSV
    if (newPath && fs.existsSync(newPath)) {
        const content = fs.readFileSync(newPath, 'utf8');
        const parsed = parse(content, { skip_empty_lines: true });
        if (parsed.length > 0) {
            headers = headers.length > 0 ? headers : parsed[0];
            newRows = parsed.slice(1);
        }
    }

    // Convert rows to string for Set comparison
    const oldSet = new Set(oldRows.map(r => JSON.stringify(r)));
    const newSet = new Set(newRows.map(r => JSON.stringify(r)));

    const diffs = [];
    let tableAdded = 0;
    let tableRemoved = 0;

    // Find removed (in old, not in new)
    oldRows.forEach(r => {
        const str = JSON.stringify(r);
        if (!newSet.has(str)) {
            diffs.push({ type: 'removed', data: r });
            totalRemoved++;
            tableRemoved++;
        }
    });

    // Find added (in new, not in old)
    newRows.forEach(r => {
        const str = JSON.stringify(r);
        if (!oldSet.has(str)) {
            diffs.push({ type: 'added', data: r });
            totalAdded++;
            tableAdded++;
        }
    });

    if (diffs.length > 0) {
        totalChangedTables++;
        // Sort diffs lexicographically by column values from left to right
        diffs.sort((a, b) => {
            const len = Math.min(a.data.length, b.data.length);
            for (let i = 0; i < len; i++) {
                if (a.data[i] !== b.data[i]) {
                    return a.data[i].localeCompare(b.data[i]);
                }
            }
            // If completely identical (e.g., duplicated row changes), put removed before added
            return a.type === 'removed' ? -1 : 1;
        });

        reports.push({
            filename: file,
            headers: headers,
            diffs: diffs,
            addedCount: tableAdded,
            removedCount: tableRemoved
        });
    }
});

const templateStr = fs.readFileSync(path.join(__dirname, 'templates', 'report.ejs'), 'utf8');
const html = ejs.render(templateStr, {
    reports,
    totalAdded,
    totalRemoved,
    totalChangedTables,
    oldDate,
    newDate,
    date: new Date().toLocaleString()
});

fs.writeFileSync(outFile, html);
console.log(`Report successfully generated at ${outFile}`);
console.log(`Total Tables Changed: ${totalChangedTables}`);
console.log(`Total Rows Added: ${totalAdded}, Removed: ${totalRemoved}`);
