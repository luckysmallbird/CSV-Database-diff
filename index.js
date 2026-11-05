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

// Recursively find all files matching a condition
const findFilesRecursively = (dir, predicate) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFilesRecursively(filePath, predicate));
        } else if (predicate(file, filePath)) {
            results.push(filePath);
        }
    });
    return results;
};

// Recursively get all CSV files and map their basename to their full path
const getCsvFiles = (dir) => {
    let results = {};
    const csvList = findFilesRecursively(dir, file => file.endsWith('.csv'));
    csvList.forEach(filePath => {
        const basename = path.basename(filePath);
        results[basename] = filePath;
    });
    return results;
};

// Extract date from folder name like vpa-dev-pvpa-20260908
const extractDateFromDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return 'Unknown';
    const subdirs = fs.readdirSync(dirPath);
    for (const subdir of subdirs) {
        const match = subdir.match(/(\d{8})/);
        if (match) return match[1];
    }
    return 'Unknown';
};

// Generic parser for PostgreSQL dump schema.sql to extract Primary Keys
const parseSchemaSql = (dirs) => {
    const tableKeys = {}; // lowercase tableName -> { tableName, primaryKeys: [...] }
    
    // Look for schema.sql in oldDir, newDir, or current directory
    let schemaFiles = [];
    dirs.forEach(d => {
        if (fs.existsSync(d)) {
            schemaFiles = schemaFiles.concat(findFilesRecursively(d, f => f.toLowerCase() === 'schema.sql'));
        }
    });
    if (fs.existsSync('schema.sql')) {
        schemaFiles.push(path.resolve('schema.sql'));
    }

    if (schemaFiles.length === 0) {
        return tableKeys;
    }

    // Read the first schema.sql found (or merge if multiple)
    schemaFiles.forEach(sqlPath => {
        try {
            const content = fs.readFileSync(sqlPath, 'utf8');

            // Pattern 1: ALTER TABLE [ONLY] [public.]"tableName" ADD CONSTRAINT ... PRIMARY KEY (col1, col2, ...);
            const alterPkRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:[\w"]+\.)?["']?(\w+)["']?\s+ADD\s+CONSTRAINT\s+["']?\w+["']?\s+PRIMARY\s+KEY\s*\(([^)]+)\);/gi;
            let match;
            while ((match = alterPkRegex.exec(content)) !== null) {
                const table = match[1];
                const colsRaw = match[2];
                const cols = colsRaw.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                tableKeys[table.toLowerCase()] = {
                    tableName: table,
                    primaryKeys: cols
                };
            }

            // Pattern 2: Inline PRIMARY KEY in CREATE TABLE ... ( ... PRIMARY KEY (...) );
            const createTableRegex = /CREATE\s+TABLE\s+(?:[\w"]+\.)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
            while ((match = createTableRegex.exec(content)) !== null) {
                const table = match[1];
                const tableBody = match[2];
                const tLower = table.toLowerCase();
                if (!tableKeys[tLower]) {
                    const pkConstraintMatch = tableBody.match(/CONSTRAINT\s+["']?\w+["']?\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i) ||
                                              tableBody.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
                    if (pkConstraintMatch) {
                        const cols = pkConstraintMatch[1].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                        tableKeys[tLower] = {
                            tableName: table,
                            primaryKeys: cols
                        };
                    }
                }
            }
        } catch (err) {
            console.warn(`Warning: Failed to parse schema SQL at ${sqlPath}:`, err.message);
        }
    });

    return tableKeys;
};

const oldDate = extractDateFromDir(oldDir);
const newDate = extractDateFromDir(newDir);

const oldFilesMap = getCsvFiles(oldDir);
const newFilesMap = getCsvFiles(newDir);
const allFiles = Array.from(new Set([...Object.keys(oldFilesMap), ...Object.keys(newFilesMap)])).sort();

const schemaKeysMap = parseSchemaSql([oldDir, newDir, '.']);

const reports = [];
let totalAdded = 0;
let totalRemoved = 0;
let totalModified = 0;
let totalIdentical = 0;
let totalChangedTables = 0;

allFiles.forEach(file => {
    const oldPath = oldFilesMap[file];
    const newPath = newFilesMap[file];
    const rawTableName = file.replace(/\.csv$/i, '');
    
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

    // Determine actual Primary Keys for this table
    const schemaInfo = schemaKeysMap[rawTableName.toLowerCase()];
    const tableName = schemaInfo ? schemaInfo.tableName : rawTableName;
    let primaryKeys = [];

    if (schemaInfo && Array.isArray(schemaInfo.primaryKeys)) {
        // Validate that all PK columns exist in headers
        const headerSet = new Set(headers);
        const validPks = schemaInfo.primaryKeys.filter(pk => headerSet.has(pk));
        if (validPks.length === schemaInfo.primaryKeys.length) {
            primaryKeys = validPks;
        }
    }

    const diffs = [];
    const identicalRows = [];
    let tableAdded = 0;
    let tableRemoved = 0;
    let tableModified = 0;
    let tableIdentical = 0;

    if (primaryKeys.length > 0) {
        // ===== MODE 1: Key-Based Comparison (Accurate INSERT / DELETE / UPDATE) =====
        const pkIndices = primaryKeys.map(pk => headers.indexOf(pk));
        const getKey = (row) => pkIndices.map(idx => (row[idx] !== undefined ? row[idx] : '')).join('|||');

        // Check uniqueness in old and new rows
        const oldMap = new Map();
        let oldDuplicate = false;
        oldRows.forEach(row => {
            const k = getKey(row);
            if (oldMap.has(k)) oldDuplicate = true;
            oldMap.set(k, row);
        });

        const newMap = new Map();
        let newDuplicate = false;
        newRows.forEach(row => {
            const k = getKey(row);
            if (newMap.has(k)) newDuplicate = true;
            newMap.set(k, row);
        });

        if (!oldDuplicate && !newDuplicate) {
            // Keys are truly unique! Run 3-way diff:
            newMap.forEach((newRow, key) => {
                if (!oldMap.has(key)) {
                    diffs.push({
                        type: 'added',
                        data: newRow
                    });
                    tableAdded++;
                    totalAdded++;
                } else {
                    const oldRow = oldMap.get(key);
                    const changedIndices = [];
                    const changedCols = [];

                    headers.forEach((h, colIdx) => {
                        const oldVal = oldRow[colIdx];
                        const newVal = newRow[colIdx];
                        if (oldVal !== newVal) {
                            changedIndices.push(colIdx);
                            changedCols.push({ col: h, oldVal, newVal });
                        }
                    });

                    if (changedIndices.length > 0) {
                        diffs.push({
                            type: 'modified',
                            oldData: oldRow,
                            newData: newRow,
                            changedIndices,
                            changedCols
                        });
                        tableModified++;
                        totalModified++;
                    } else {
                        identicalRows.push(newRow);
                        tableIdentical++;
                        totalIdentical++;
                    }
                }
            });

            oldMap.forEach((oldRow, key) => {
                if (!newMap.has(key)) {
                    diffs.push({
                        type: 'removed',
                        data: oldRow
                    });
                    tableRemoved++;
                    totalRemoved++;
                }
            });
        } else {
            // Duplicate keys found; fall back to set-based comparison
            primaryKeys = [];
        }
    }

    if (primaryKeys.length === 0) {
        // ===== MODE 2: Set-Based Comparison (No PK / Fallback) =====
        const oldCounts = new Map();
        oldRows.forEach(r => {
            const str = JSON.stringify(r);
            oldCounts.set(str, (oldCounts.get(str) || 0) + 1);
        });

        const newCounts = new Map();
        newRows.forEach(r => {
            const str = JSON.stringify(r);
            newCounts.set(str, (newCounts.get(str) || 0) + 1);
        });

        const allRowStrings = new Set([...oldCounts.keys(), ...newCounts.keys()]);

        allRowStrings.forEach(str => {
            const row = JSON.parse(str);
            const oldCount = oldCounts.get(str) || 0;
            const newCount = newCounts.get(str) || 0;

            const commonCount = Math.min(oldCount, newCount);
            for (let i = 0; i < commonCount; i++) {
                identicalRows.push(row);
                tableIdentical++;
                totalIdentical++;
            }

            if (newCount > oldCount) {
                const diffCount = newCount - oldCount;
                for (let i = 0; i < diffCount; i++) {
                    diffs.push({ type: 'added', data: row });
                    tableAdded++;
                    totalAdded++;
                }
            } else if (oldCount > newCount) {
                const diffCount = oldCount - newCount;
                for (let i = 0; i < diffCount; i++) {
                    diffs.push({ type: 'removed', data: row });
                    tableRemoved++;
                    totalRemoved++;
                }
            }
        });
    }

    // Sort diffs
    diffs.sort((a, b) => {
        const typeOrder = { modified: 1, added: 2, removed: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        const aData = a.newData || a.data;
        const bData = b.newData || b.data;
        const len = Math.min(aData.length, bData.length);
        for (let i = 0; i < len; i++) {
            if (aData[i] !== bData[i]) {
                return String(aData[i]).localeCompare(String(bData[i]));
            }
        }
        return 0;
    });

    if (diffs.length > 0 || identicalRows.length > 0) {
        if (diffs.length > 0) totalChangedTables++;
        reports.push({
            filename: file,
            tableName: tableName,
            headers: headers,
            primaryKeys: primaryKeys,
            diffs: diffs,
            identicalRows: identicalRows,
            addedCount: tableAdded,
            removedCount: tableRemoved,
            modifiedCount: tableModified,
            identicalCount: tableIdentical
        });
    }
});

const templateStr = fs.readFileSync(path.join(__dirname, 'templates', 'report.ejs'), 'utf8');
const html = ejs.render(templateStr, {
    reports,
    totalAdded,
    totalRemoved,
    totalModified,
    totalIdentical,
    totalChangedTables,
    oldDate,
    newDate,
    date: new Date().toLocaleString()
});

fs.writeFileSync(outFile, html);
console.log(`Report successfully generated at ${outFile}`);
console.log(`Total Tables: ${reports.length}, Tables Changed: ${totalChangedTables}`);
console.log(`Added: ${totalAdded}, Removed: ${totalRemoved}, Modified: ${totalModified}, Identical: ${totalIdentical}`);
