CSV Database Diff Tool

A lightweight, zero-configuration Node.js tool designed to compare two directories of CSV database dumps and generate an interactive HTML report.

Features
- Generic Diffing: Automatically detects additions and removals across any CSV files without needing primary key configurations.
- Deep Recursive Scanning: Handles deeply nested directory structures. Just drop your entire exported folder into the target directories.
- Smart Date Extraction: If your folder name contains an 8-digit date (e.g., backup-20260908), the tool will automatically extract it and display "Old Version" vs "New Version" dates in the report.
- Interactive Report: Professional UI with clickable sortable columns, table collapse toggles, and unified Expand/Collapse All actions.

Directory Structure
To use the tool, place your exported database folders into old_db and new_db like this:

CSV-Database-diff/
|-- old_db/
|   `-- my-database-export-20260908/
|       |-- users/
|       |   `-- UserDevices.csv
|       `-- settings/
|           `-- Mode_Attributes.csv
|-- new_db/
|   `-- my-database-export-20260924/
|       |-- users/
|       |   `-- UserDevices.csv
|       `-- settings/
|           `-- Mode_Attributes.csv
|-- index.js
|-- package.json
`-- templates/
    `-- report.ejs

Usage
1. Install dependencies: 
   npm install

2. Generate the report: 
   npm start

3. View the results: 
   Open the newly generated report.html in your browser.