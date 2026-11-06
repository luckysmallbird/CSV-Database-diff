// Toggle identical section
function toggleIdentical(el) {
    const content = el.nextElementSibling;
    const arrow = el.querySelector('.arrow-icon');
    if (content.style.display === 'block') {
        content.style.display = 'none';
        arrow.textContent = '▶';
    } else {
        content.style.display = 'block';
        arrow.textContent = '▼';
    }
}

// Toggle main TOC links section
function toggleMainToc(el) {
    const container = el.closest('.toc-container');
    if (!container) return;
    const linksSection = container.querySelector('.toc-links-section');
    const arrow = el.querySelector('.toc-main-arrow');
    const isClosed = container.classList.contains('collapsed') || (linksSection && linksSection.style.display === 'none');
    if (isClosed) {
        container.classList.remove('collapsed');
        if (linksSection) linksSection.style.display = 'flex';
        if (arrow) arrow.textContent = '▴';
    } else {
        container.classList.add('collapsed');
        if (linksSection) linksSection.style.display = 'none';
        if (arrow) arrow.textContent = '▾';
    }
}

// Toggle unchecked section (in snapshot)
function toggleUnchecked(el) {
    const content = el.nextElementSibling;
    const arrow = el.querySelector('.arrow-icon');
    if (content.style.display === 'block') {
        content.style.display = 'none';
        arrow.textContent = '▶';
    } else {
        content.style.display = 'block';
        arrow.textContent = '▼';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Toggle identical tables in TOC
    const btnToggleIdenticalToc = document.getElementById('btn-toggle-identical-toc');
    const containerIdenticalToc = document.getElementById('toc-identical-links-container');
    if (btnToggleIdenticalToc && containerIdenticalToc) {
        btnToggleIdenticalToc.addEventListener('click', () => {
            const isHidden = containerIdenticalToc.style.display === 'none';
            containerIdenticalToc.style.display = isHidden ? 'flex' : 'none';
            btnToggleIdenticalToc.classList.toggle('active', isHidden);
            const arrow = btnToggleIdenticalToc.querySelector('.toc-arrow');
            if (arrow) arrow.textContent = isHidden ? '▴' : '▾';
        });
    }

    // Toggle all unchecked rows (in snapshot)
    const btnToggleAllUnchecked = document.getElementById('btn-toggle-all-unchecked');
    let allUncheckedOpen = false;
    if (btnToggleAllUnchecked) {
        btnToggleAllUnchecked.addEventListener('click', () => {
            allUncheckedOpen = !allUncheckedOpen;
            document.querySelectorAll('.unchecked-section').forEach(sec => {
                const content = sec.querySelector('.unchecked-content');
                const arrow = sec.querySelector('.arrow-icon');
                if (content && arrow) {
                    content.style.display = allUncheckedOpen ? 'block' : 'none';
                    arrow.textContent = allUncheckedOpen ? '▼' : '▶';
                }
            });
            btnToggleAllUnchecked.classList.toggle('active', allUncheckedOpen);
            btnToggleAllUnchecked.textContent = allUncheckedOpen ? '一鍵收合所有未勾選' : '一鍵展開所有未勾選';
        });
    }

    // Expand / Collapse All
    const btnExpandAll = document.getElementById('btn-expand-all');
    const btnCollapseAll = document.getElementById('btn-collapse-all');
    if (btnExpandAll && btnCollapseAll) {
        btnExpandAll.addEventListener('click', () => {
            document.querySelectorAll('.table-card').forEach(card => card.classList.remove('collapsed'));
        });
        btnCollapseAll.addEventListener('click', () => {
            document.querySelectorAll('.table-card').forEach(card => card.classList.add('collapsed'));
        });
    }

    // Checkbox and Selection State
    const updateSelectedCount = () => {
        const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
        document.getElementById('selected-count').textContent = checkedCount;
    };

    // Header Checkbox (Select all visible within that table)
    document.querySelectorAll('.header-checkbox').forEach(headerCb => {
        headerCb.addEventListener('change', (e) => {
            const table = e.target.closest('table');
            const rowCheckboxes = table.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(cb => {
                const tr = cb.closest('tr');
                if (tr.style.display !== 'none') {
                    cb.checked = e.target.checked;
                }
            });
            updateSelectedCount();
        });
    });

    // Track last clicked checkbox per table for Shift + click range selection
    const lastClickedCheckboxMap = new WeakMap();

    // Row Checkbox change and Shift+Click range selection
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
            const table = cb.closest('table');
            if (table) {
                const lastClicked = lastClickedCheckboxMap.get(table);

                // If Shift key is pressed and we have a previous anchor within the same table
                if (e.shiftKey && lastClicked && lastClicked !== cb) {
                    // Get all currently VISIBLE row checkboxes in current DOM order (respecting sorting and search filters)
                    const visibleCheckboxes = Array.from(table.querySelectorAll('.row-checkbox')).filter(item => {
                        const tr = item.closest('tr');
                        return tr && tr.style.display !== 'none';
                    });

                    const startIdx = visibleCheckboxes.indexOf(lastClicked);
                    const endIdx = visibleCheckboxes.indexOf(cb);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const minIdx = Math.min(startIdx, endIdx);
                        const maxIdx = Math.max(startIdx, endIdx);
                        const targetCheckedState = cb.checked;

                        for (let i = minIdx; i <= maxIdx; i++) {
                            visibleCheckboxes[i].checked = targetCheckedState;
                        }
                    }
                }

                // Update the last clicked checkbox for this table
                lastClickedCheckboxMap.set(table, cb);
            }

            updateSelectedCount();
        });
    });

    // Global Select All / Clear All
    const btnSelectAllDiffs = document.getElementById('btn-select-all-diffs');
    if (btnSelectAllDiffs) {
        btnSelectAllDiffs.addEventListener('click', () => {
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                const tr = cb.closest('tr');
                if (tr.style.display !== 'none') {
                    cb.checked = true;
                }
            });
            document.querySelectorAll('.header-checkbox').forEach(cb => cb.checked = true);
            updateSelectedCount();
        });
    }

    const btnClearAllDiffs = document.getElementById('btn-clear-all-diffs');
    if (btnClearAllDiffs) {
        btnClearAllDiffs.addEventListener('click', () => {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.header-checkbox').forEach(cb => cb.checked = false);
            updateSelectedCount();
        });
    }

    // Toggle: Show only checked rows
    const btnToggleOnlyChecked = document.getElementById('btn-toggle-only-checked');
    let isFilterOnlyChecked = false;
    if (btnToggleOnlyChecked) {
        btnToggleOnlyChecked.addEventListener('click', () => {
            isFilterOnlyChecked = !isFilterOnlyChecked;
            if (isFilterOnlyChecked) {
                btnToggleOnlyChecked.classList.add('active');
                btnToggleOnlyChecked.textContent = '顯示全部項目';
                document.querySelectorAll('.diff-table tbody tr').forEach(tr => {
                    const cb = tr.querySelector('.row-checkbox');
                    if (cb && cb.checked) {
                        tr.style.display = '';
                    } else {
                        tr.style.display = 'none';
                    }
                });
            } else {
                btnToggleOnlyChecked.classList.remove('active');
                btnToggleOnlyChecked.textContent = '只顯示已勾選項目';
                document.querySelectorAll('.diff-table tbody tr').forEach(tr => {
                    tr.style.display = '';
                });
            }
        });
    }

    // Per-table search and filtering
    const isSnapshot = !document.getElementById('sql-bar');

    document.querySelectorAll('.table-card').forEach(card => {
        const searchInput = card.querySelector('.table-search-input');
        const clearBtn = card.querySelector('.search-clear-btn');
        const countLabel = card.querySelector('.table-count-label');
        const diffRows = card.querySelectorAll('.diff-table tbody tr');
        const totalDiffs = diffRows.length;

        const applyFilter = () => {
            if (!searchInput) return;
            const kw = searchInput.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = kw ? 'block' : 'none';

            let visibleCount = 0;
            diffRows.forEach(tr => {
                const text = tr.textContent.toLowerCase();
                const matchesKw = !kw || text.includes(kw);
                const matchesChecked = !isFilterOnlyChecked || (tr.querySelector('.row-checkbox') && tr.querySelector('.row-checkbox').checked);

                if (matchesKw && matchesChecked) {
                    tr.style.display = '';
                    visibleCount++;
                } else {
                    tr.style.display = 'none';
                }
            });

            if (countLabel) {
                if (kw || isFilterOnlyChecked) {
                    countLabel.textContent = `篩選: ${visibleCount} / ${totalDiffs} 筆`;
                } else if (isSnapshot) {
                    const checkedCount = card.querySelectorAll('.mark-checked').length;
                    const uncheckedCount = card.querySelectorAll('.mark-unchecked').length;
                    if (checkedCount > 0) {
                        countLabel.textContent = uncheckedCount > 0 ? `預計同步 ${checkedCount} 筆 (未選 ${uncheckedCount} 筆)` : `預計同步 ${checkedCount} 筆`;
                    } else {
                        countLabel.textContent = '未選取變更';
                    }
                } else {
                    countLabel.textContent = `差異共 ${totalDiffs} 筆`;
                }
            }
        };

        if (searchInput) {
            searchInput.addEventListener('input', applyFilter);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                applyFilter();
                searchInput.focus();
            });
        }

        // Per-table action buttons (respecting filter visibility)
        const rowCheckboxes = card.querySelectorAll('.row-checkbox');
        const setTypeCheck = (predicate) => {
            rowCheckboxes.forEach(cb => {
                const tr = cb.closest('tr');
                if (tr.style.display === 'none') return; // Skip hidden rows!
                cb.checked = predicate(tr.getAttribute('data-diff-type'));
            });
            updateSelectedCount();
        };

        const btnAll = card.querySelector('.btn-select-table-all');
        if (btnAll) btnAll.addEventListener('click', () => setTypeCheck(() => true));

        const btnAdd = card.querySelector('.btn-select-table-add');
        if (btnAdd) btnAdd.addEventListener('click', () => setTypeCheck(t => t === 'added'));

        const btnMod = card.querySelector('.btn-select-table-mod');
        if (btnMod) btnMod.addEventListener('click', () => setTypeCheck(t => t === 'modified'));

        const btnRem = card.querySelector('.btn-select-table-rem');
        if (btnRem) btnRem.addEventListener('click', () => setTypeCheck(t => t === 'removed'));

        const btnNone = card.querySelector('.btn-select-table-none');
        if (btnNone) btnNone.addEventListener('click', () => setTypeCheck(() => false));
    });

    // Toast helper
    const showToast = (msg) => {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    };

    // PostgreSQL Value Escape
    const escapePg = (val) => {
        if (val === null || val === undefined || val === '' || val === '\\N') {
            return 'NULL';
        }
        return "'" + String(val).replace(/'/g, "''") + "'";
    };

    // Generate PostgreSQL Sync Script from checked rows
    const generateSql = () => {
        const checkedRows = document.querySelectorAll('.row-checkbox:checked');
        if (checkedRows.length === 0) {
            return '-- 尚未勾選任何差異列。\n-- 請在上方勾選欲同步的列後，再次產生 SQL。';
        }

        const oldTarget = document.body.getAttribute('data-old-target') || 'OldDB';
        const newSource = document.body.getAttribute('data-new-source') || 'NewDB';

        const lines = [];
        lines.push('-- ==============================================================================');
        lines.push('-- PostgreSQL 資料庫資料同步腳本');
        lines.push(`-- 舊版資料庫 (目標 Target): ${oldTarget}`);
        lines.push(`-- 新版資料庫 (來源 Source): ${newSource}`);
        lines.push(`-- 產生時間: ${new Date().toLocaleString()}`);
        lines.push(`-- 本次選取同步筆數: ${checkedRows.length} 筆`);
        lines.push('-- ==============================================================================\n');
        lines.push('BEGIN;\n');

        let currentTable = null;

        checkedRows.forEach(cb => {
            const tr = cb.closest('tr');
            const card = tr.closest('.table-card');
            const tableEl = tr.closest('table');

            const tableName = card.getAttribute('data-tablename');
            const pks = JSON.parse(card.getAttribute('data-pks') || '[]');
            const headers = JSON.parse(tableEl.getAttribute('data-headers') || '[]');
            const diffType = tr.getAttribute('data-diff-type');

            if (tableName !== currentTable) {
                currentTable = tableName;
                lines.push(`\n-- ------------------------------------------------------------------------------`);
                lines.push(`-- 資料表: public."${tableName}"`);
                lines.push(`-- ------------------------------------------------------------------------------`);
            }

            if (diffType === 'added') {
                // INSERT: New DB has it, Old DB doesn't -> Insert into Old DB
                const data = JSON.parse(tr.getAttribute('data-row-data'));
                const colNames = headers.map(h => `"${h}"`).join(', ');
                const colValues = data.map(v => escapePg(v)).join(', ');
                lines.push(`INSERT INTO public."${tableName}" (${colNames}) VALUES (${colValues});`);

            } else if (diffType === 'removed') {
                // DELETE: Old DB has it, New DB doesn't -> Delete from Old DB
                const data = JSON.parse(tr.getAttribute('data-row-data'));
                if (pks.length > 0) {
                    const whereClauses = pks.map(pk => {
                        const idx = headers.indexOf(pk);
                        const val = data[idx];
                        return val === '' || val === '\\N' ? `"${pk}" IS NULL` : `"${pk}" = ${escapePg(val)}`;
                    });
                    lines.push(`DELETE FROM public."${tableName}" WHERE ${whereClauses.join(' AND ')};`);
                } else {
                    // Safe DELETE using PostgreSQL ctid to delete exactly 1 row
                    const whereClauses = headers.map((h, i) => {
                        const val = data[i];
                        return val === '' || val === '\\N' ? `"${h}" IS NULL` : `"${h}" = ${escapePg(val)}`;
                    });
                    lines.push(`DELETE FROM public."${tableName}" WHERE ctid IN (SELECT ctid FROM public."${tableName}" WHERE ${whereClauses.join(' AND ')} LIMIT 1);`);
                }

            } else if (diffType === 'modified') {
                // UPDATE: Both have it, some columns changed -> Update Old DB to New DB values
                const oldData = JSON.parse(tr.getAttribute('data-old-data'));
                const newData = JSON.parse(tr.getAttribute('data-new-data'));
                const changedIndices = JSON.parse(tr.getAttribute('data-changed-indices'));

                const setClauses = changedIndices.map(idx => {
                    const col = headers[idx];
                    return `"${col}" = ${escapePg(newData[idx])}`;
                });

                if (pks.length > 0) {
                    const whereClauses = pks.map(pk => {
                        const idx = headers.indexOf(pk);
                        const val = oldData[idx];
                        return val === '' || val === '\\N' ? `"${pk}" IS NULL` : `"${pk}" = ${escapePg(val)}`;
                    });
                    lines.push(`UPDATE public."${tableName}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`);
                } else {
                    // Fallback for no PK
                    const whereClauses = headers.map((h, i) => {
                        const val = oldData[i];
                        return val === '' || val === '\\N' ? `"${h}" IS NULL` : `"${h}" = ${escapePg(val)}`;
                    });
                    lines.push(`UPDATE public."${tableName}" SET ${setClauses.join(', ')} WHERE ctid IN (SELECT ctid FROM public."${tableName}" WHERE ${whereClauses.join(' AND ')} LIMIT 1);`);
                }
            }
        });

        lines.push('\nCOMMIT;\n');
        return lines.join('\n');
    };

    // Modal Handling
    const modal = document.getElementById('sql-modal');
    const sqlCodeBlock = document.getElementById('sql-code-block');

    const btnPreviewSql = document.getElementById('btn-preview-sql');
    if (btnPreviewSql && sqlCodeBlock && modal) {
        btnPreviewSql.addEventListener('click', () => {
            const sql = generateSql();
            sqlCodeBlock.textContent = sql;
            modal.style.display = 'flex';
        });
    }

    const modalClose = document.getElementById('modal-close');
    if (modalClose && modal) {
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Copy SQL
    const copySqlToClipboard = () => {
        const sql = generateSql();
        navigator.clipboard.writeText(sql).then(() => {
            showToast('PostgreSQL 腳本已複製至剪貼簿！');
        }).catch(err => {
            console.error('Copy failed:', err);
            showToast('複製失敗，請手動複製');
        });
    };

    const btnCopySql = document.getElementById('btn-copy-sql');
    if (btnCopySql) btnCopySql.addEventListener('click', copySqlToClipboard);

    const modalCopyBtn = document.getElementById('modal-copy-btn');
    if (modalCopyBtn) modalCopyBtn.addEventListener('click', copySqlToClipboard);

    // Format current timestamp as YYYYMMDD_HHmmss
    const getFormattedTime = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${y}${m}${d}_${hh}${mm}${ss}`;
    };

    // Download SQL
    const downloadSqlFile = () => {
        const sql = generateSql();
        const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const oldTarget = document.body.getAttribute('data-old-target') || 'old';
        const timeStr = getFormattedTime();
        const exportFileName = `修正${oldTarget}_${timeStr}.sql`;
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`已開始下載 SQL 檔案：${exportFileName}`);
    };

    const btnDownloadSql = document.getElementById('btn-download-sql');
    if (btnDownloadSql) btnDownloadSql.addEventListener('click', downloadSqlFile);

    const modalDownloadBtn = document.getElementById('modal-download-btn');
    if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', downloadSqlFile);

    // Export Checked Snapshot HTML
    const btnExportSnapshot = document.getElementById('btn-export-snapshot');
    if (btnExportSnapshot) {
        btnExportSnapshot.addEventListener('click', () => {
            // 1. Calculate global stats on the live document before cloning
            let totalCheckedAdded = 0;
            let totalCheckedModified = 0;
            let totalCheckedRemoved = 0;
            let totalCheckedCount = 0;
            let totalRawDiffsCount = 0;

            document.querySelectorAll('.table-card:not(.table-card-identical)').forEach(card => {
                const diffRows = card.querySelectorAll('.diff-table tbody tr');
                totalRawDiffsCount += diffRows.length;
                diffRows.forEach(tr => {
                    const cb = tr.querySelector('.row-checkbox');
                    if (cb && cb.checked) {
                        totalCheckedCount++;
                        const type = tr.getAttribute('data-diff-type');
                        if (type === 'added') totalCheckedAdded++;
                        else if (type === 'modified') totalCheckedModified++;
                        else if (type === 'removed') totalCheckedRemoved++;
                    }
                });
            });
            const totalUncheckedCount = totalRawDiffsCount - totalCheckedCount;

            // 2. Synchronize the current checkbox 'checked' state into DOM attributes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (cb.checked) {
                    cb.setAttribute('checked', 'checked');
                } else {
                    cb.removeAttribute('checked');
                }
            });

            // 3. Clone the current document element
            const clone = document.documentElement.cloneNode(true);

            // 4. Remove Subtitle
            const subtitle = clone.querySelector('.subtitle');
            if (subtitle) subtitle.remove();

            // 5. Remove Identical Sections & Identical Cards completely to remove clutter & reduce file size
            clone.querySelectorAll('.table-card-identical').forEach(el => el.remove());
            clone.querySelectorAll('.identical-section').forEach(el => el.remove());
            const btnIdenticalToc = clone.querySelector('#btn-toggle-identical-toc');
            if (btnIdenticalToc) btnIdenticalToc.remove();
            const containerIdenticalToc = clone.querySelector('#toc-identical-links-container');
            if (containerIdenticalToc) containerIdenticalToc.remove();

            // 6. Clean up editing toolbars and floating action bar for pure read-only view
            clone.querySelectorAll('.card-toolbar').forEach(el => el.remove());
            clone.querySelectorAll('.sql-bar, .modal-overlay').forEach(el => el.remove());
            ['btn-toggle-only-checked', 'btn-select-all-diffs', 'btn-clear-all-diffs'].forEach(id => {
                const btn = clone.querySelector('#' + id);
                if (btn) btn.remove();
            });

            // 7. Process Cards & Table Headers/Bodies
            const diffCards = Array.from(clone.querySelectorAll('.table-card'));
            let tablesWithCheckedCount = 0;

            diffCards.forEach(card => {
                const diffTable = card.querySelector('.diff-table');
                let cardCheckedAdded = 0;
                let cardCheckedModified = 0;
                let cardCheckedRemoved = 0;
                let cardCheckedTotal = 0;
                let uncheckedRowCount = 0;

                if (diffTable) {
                    const thead = diffTable.querySelector('thead');
                    const tbody = diffTable.querySelector('tbody');

                    if (tbody) {
                        const rows = Array.from(tbody.querySelectorAll('tr'));
                        const checkedRows = [];
                        const uncheckedRows = [];

                        rows.forEach(tr => {
                            const cb = tr.querySelector('.row-checkbox');
                            const isChecked = cb && cb.hasAttribute('checked');
                            const type = tr.getAttribute('data-diff-type');

                            if (isChecked) {
                                checkedRows.push(tr);
                                cardCheckedTotal++;
                                if (type === 'added') cardCheckedAdded++;
                                else if (type === 'modified') cardCheckedModified++;
                                else if (type === 'removed') cardCheckedRemoved++;
                            } else {
                                uncheckedRows.push(tr);
                            }
                        });

                        uncheckedRowCount = uncheckedRows.length;

                        // Replace thead checkbox with "狀態"
                        if (thead) {
                            const thCb = thead.querySelector('th.th-checkbox');
                            if (thCb) {
                                thCb.innerHTML = '狀態';
                                thCb.style.textAlign = 'center';
                                thCb.style.cursor = 'default';
                            }
                        }

                        // Replace row checkbox in checked rows with green checkmark ✓
                        checkedRows.forEach(tr => {
                            const tdCb = tr.querySelector('td.th-checkbox');
                            if (tdCb) {
                                tdCb.innerHTML = '<span class="mark-checked">✓</span>';
                            }
                        });

                        // Unchecked rows folded into section
                        if (uncheckedRows.length > 0) {
                            const uncheckedSection = document.createElement('div');
                            uncheckedSection.className = 'unchecked-section';

                            const toggle = document.createElement('div');
                            toggle.className = 'unchecked-toggle';
                            toggle.setAttribute('onclick', 'toggleUnchecked(this)');
                            toggle.innerHTML = `<span class="arrow-icon">▶</span><span>未勾選項目（${uncheckedRows.length} 筆）</span>`;

                            const content = document.createElement('div');
                            content.className = 'unchecked-content';
                            content.style.display = 'none';

                            const newTable = document.createElement('table');
                            newTable.className = 'diff-table';
                            if (thead) newTable.appendChild(thead.cloneNode(true));

                            const newTbody = document.createElement('tbody');
                            uncheckedRows.forEach(tr => {
                                tr.remove();
                                const tdCb = tr.querySelector('td.th-checkbox');
                                if (tdCb) {
                                    tdCb.innerHTML = '<span class="mark-unchecked">-</span>';
                                }
                                newTbody.appendChild(tr);
                            });
                            newTable.appendChild(newTbody);
                            content.appendChild(newTable);

                            uncheckedSection.appendChild(toggle);
                            uncheckedSection.appendChild(content);

                            const body = card.querySelector('.table-card-body');
                            if (body) {
                                body.appendChild(uncheckedSection);
                            }
                        }

                        // If no rows were checked in this card
                        if (cardCheckedTotal === 0) {
                            const wrapper = diffTable.closest('.table-responsive');
                            if (wrapper) {
                                wrapper.remove();
                            } else {
                                diffTable.remove();
                            }
                            card.classList.add('collapsed');
                        }
                    }
                }

                if (cardCheckedTotal > 0) {
                    tablesWithCheckedCount++;
                }

                // Update Card Header Badges
                const badgesContainer = card.querySelector('.table-badges');
                if (badgesContainer) {
                    if (cardCheckedTotal > 0) {
                        let badgeHtml = '';
                        if (cardCheckedAdded > 0) badgeHtml += `<span class="badge-added">+ 預計新增 ${cardCheckedAdded}</span> `;
                        if (cardCheckedModified > 0) badgeHtml += `<span class="badge-modified">~ 預計更新 ${cardCheckedModified}</span> `;
                        if (cardCheckedRemoved > 0) badgeHtml += `<span class="badge-removed">- 預計刪除 ${cardCheckedRemoved}</span> `;
                        badgesContainer.innerHTML = badgeHtml;
                    } else {
                        badgesContainer.innerHTML = '<span class="badge-identical-tag" style="color: #5f6368; background: #f1f3f4; border: 1px solid #dadce0;">本次略過（未選取）</span>';
                    }
                }

                // Update Card Header Count Label (keep search box untouched)
                const countLabel = card.querySelector('.table-count-label');
                if (countLabel) {
                    if (cardCheckedTotal > 0) {
                        countLabel.textContent = uncheckedRowCount > 0 ? `預計同步 ${cardCheckedTotal} 筆 (未選 ${uncheckedRowCount} 筆)` : `預計同步 ${cardCheckedTotal} 筆`;
                    } else {
                        countLabel.textContent = '未選取變更';
                    }
                }

                // Store checked count attribute for sorting
                card.setAttribute('data-checked-count', String(cardCheckedTotal));
            });

            // 8. Update Top Summary
            const oldTarget = document.body.getAttribute('data-old-target') || 'old';
            const newSource = document.body.getAttribute('data-new-source') || 'new';
            const summaryDiv = clone.querySelector('.summary');
            if (summaryDiv) {
                summaryDiv.innerHTML = `
        <p>
            <strong>舊版資料夾 (Old Target):</strong> ${oldTarget} &nbsp;|&nbsp; 
            <strong>新版資料夾 (New Source):</strong> ${newSource} &nbsp;|&nbsp; 
            <strong>存檔時間:</strong> ${new Date().toLocaleString()}
        </p>
        <p>
            <span><strong>預計同步表格數:</strong> ${tablesWithCheckedCount} / ${diffCards.length}</span>
            <span style="font-weight: 500; color: #202124; margin-right: 15px;">總計 ${totalCheckedCount} 筆</span>
            <span class="badge-added">+ 預計新增 ${totalCheckedAdded}</span>
            <span class="badge-modified">~ 預計更新 ${totalCheckedModified}</span>
            <span class="badge-removed">- 預計刪除 ${totalCheckedRemoved}</span>
        </p>`;
            }

            // 9. Sort Cards in snapshot:
            // Group 1: Tables with checked rows > 0 (alphabetical by filename)
            // Group 2: Tables with 0 checked rows (alphabetical by filename)
            diffCards.sort((a, b) => {
                const aChecked = parseInt(a.getAttribute('data-checked-count') || '0', 10);
                const bChecked = parseInt(b.getAttribute('data-checked-count') || '0', 10);
                const aHas = aChecked > 0 ? 1 : 0;
                const bHas = bChecked > 0 ? 1 : 0;

                if (aHas !== bHas) {
                    return bHas - aHas;
                }

                const aFile = a.getAttribute('data-filename') || '';
                const bFile = b.getAttribute('data-filename') || '';
                return aFile.localeCompare(bFile);
            });

            const firstCard = clone.querySelector('.table-card');
            if (firstCard && firstCard.parentNode) {
                const parent = firstCard.parentNode;
                diffCards.forEach(card => parent.appendChild(card));
            }

            // 10. Update TOC in Snapshot (collapsed by default)
            const tocContainer = clone.querySelector('.toc-container');
            if (tocContainer) {
                tocContainer.classList.add('collapsed');
                const linksSection = tocContainer.querySelector('.toc-links-section');
                if (linksSection) linksSection.style.display = 'none';
            }

            const tocTitle = clone.querySelector('.toc-title');
            if (tocTitle) {
                tocTitle.innerHTML = `
                    <button class="toc-toggle-btn" id="btn-toggle-main-toc" type="button" onclick="toggleMainToc(this)" title="點擊展開/收合快速跳轉">
                        <strong>快速跳轉</strong>
                        <span class="toc-summary-text">（預計同步 ${tablesWithCheckedCount} 表，共 ${totalCheckedCount} 筆）</span>
                        <span class="toc-main-arrow">▾</span>
                    </button>
                `;
            }

            const tocChangedLinksContainer = clone.querySelector('.toc-changed-links');
            if (tocChangedLinksContainer) {
                tocChangedLinksContainer.innerHTML = '';
                diffCards.forEach(card => {
                    const filename = card.getAttribute('data-filename');
                    const checkedInCard = parseInt(card.getAttribute('data-checked-count') || '0', 10);
                    const uncheckedInCard = card.querySelectorAll('.unchecked-content tr').length;

                    const a = document.createElement('a');
                    a.className = 'toc-link';
                    a.href = '#table-' + filename;

                    if (checkedInCard > 0) {
                        a.innerHTML = `${filename} <span class="toc-badge-count">(已選 ${checkedInCard} 筆${uncheckedInCard > 0 ? ` / 未選 ${uncheckedInCard}` : ''})</span>`;
                    } else {
                        a.className += ' toc-link-unchecked';
                        a.style.background = '#f1f3f4';
                        a.style.color = '#5f6368';
                        a.innerHTML = `${filename} <span class="toc-badge-count">(略過 / 0 筆)</span>`;
                    }
                    tocChangedLinksContainer.appendChild(a);
                });
            }

            // 11. Add "一鍵展開未勾選項目" button to TOC if there are unchecked rows
            if (totalUncheckedCount > 0) {
                const tocActions = clone.querySelector('.toc-actions');
                if (tocActions && !clone.querySelector('#btn-toggle-all-unchecked')) {
                    const btnToggleAllUnchecked = document.createElement('button');
                    btnToggleAllUnchecked.className = 'btn-action';
                    btnToggleAllUnchecked.id = 'btn-toggle-all-unchecked';
                    btnToggleAllUnchecked.textContent = `一鍵展開所有未勾選 (${totalUncheckedCount})`;
                    tocActions.appendChild(btnToggleAllUnchecked);
                }
            }

            // 12. Construct filename: 資料庫比對_舊版xxx_新版xxx_時間.html
            const timeStr = getFormattedTime();
            const exportFileName = `資料庫比對_舊版${oldTarget}_新版${newSource}_${timeStr}.html`;

            // 13. Trigger download
            const fullHtml = '<!DOCTYPE html>\n<html lang="zh-Hant">\n' + clone.innerHTML + '\n</html>';
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`已另存勾選紀錄：${exportFileName}`);
        });
    }

    // Table Sorting
    document.querySelectorAll('.diff-table, .identical-table').forEach(table => {
        const headers = table.querySelectorAll('th:not(.th-checkbox)');
        const tbody = table.querySelector('tbody');
        
        headers.forEach((header) => {
            header.addEventListener('click', () => {
                const index = Array.from(header.parentElement.children).indexOf(header);
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const isAscending = header.getAttribute('data-sort') === 'asc';
                const direction = isAscending ? -1 : 1;
                
                headers.forEach(h => h.setAttribute('data-sort', 'none'));
                header.setAttribute('data-sort', isAscending ? 'desc' : 'asc');
                
                headers.forEach(h => {
                    let text = h.innerText.replace(/ [↑↓]$/, '');
                    if (h.getAttribute('data-sort') === 'asc') text += ' ↑';
                    if (h.getAttribute('data-sort') === 'desc') text += ' ↓';
                    h.innerText = text;
                });
                
                rows.sort((a, b) => {
                    const aCell = a.children[index];
                    const bCell = b.children[index];
                    if (!aCell || !bCell) return 0;
                    const aText = aCell.textContent.trim();
                    const bText = bCell.textContent.trim();
                    
                    const aNum = parseFloat(aText);
                    const bNum = parseFloat(bText);
                    if (!isNaN(aNum) && !isNaN(bNum) && aNum.toString() === aText && bNum.toString() === bText) {
                        return (aNum - bNum) * direction;
                    }
                    return aText.localeCompare(bText) * direction;
                });
                
                tbody.append(...rows);
            });
        });
    });

    // Initial count sync
    updateSelectedCount();
});
