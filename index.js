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

// Get all CSV files
const getCsvFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
};

const oldFiles = new Set(getCsvFiles(oldDir));
const newFiles = new Set(getCsvFiles(newDir));
const allFiles = Array.from(new Set([...oldFiles, ...newFiles])).sort();

const reports = [];
let totalAdded = 0;
let totalRemoved = 0;
let totalChangedTables = 0;

allFiles.forEach(file => {
    const oldPath = path.join(oldDir, file);
    const newPath = path.join(newDir, file);
    
    let oldRows = [];
    let newRows = [];
    let headers = [];

    // Parse Old CSV
    if (fs.existsSync(oldPath)) {
        const content = fs.readFileSync(oldPath, 'utf8');
        const parsed = parse(content, { skip_empty_lines: true });
        if (parsed.length > 0) {
            headers = parsed[0];
            oldRows = parsed.slice(1);
        }
    }

    // Parse New CSV
    if (fs.existsSync(newPath)) {
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

    // Find removed (in old, not in new)
    oldRows.forEach(r => {
        const str = JSON.stringify(r);
        if (!newSet.has(str)) {
            diffs.push({ type: 'removed', data: r });
            totalRemoved++;
        }
    });

    // Find added (in new, not in old)
    newRows.forEach(r => {
        const str = JSON.stringify(r);
        if (!oldSet.has(str)) {
            diffs.push({ type: 'added', data: r });
            totalAdded++;
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
            diffs: diffs
        });
    }
});

const templateStr = fs.readFileSync(path.join(__dirname, 'templates', 'report.ejs'), 'utf8');
const html = ejs.render(templateStr, {
    reports,
    totalAdded,
    totalRemoved,
    totalChangedTables,
    date: new Date().toLocaleString()
});

fs.writeFileSync(outFile, html);
console.log(`Report successfully generated at ${outFile}`);
console.log(`Total Tables Changed: ${totalChangedTables}`);
console.log(`Total Rows Added: ${totalAdded}, Removed: ${totalRemoved}`);
