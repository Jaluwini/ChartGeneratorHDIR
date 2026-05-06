import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const tableId = url.searchParams.get('id');
    
    if (!tableId) {
      return Response.json({ error: 'Missing table ID' }, { status: 400 });
    }

    const saved = await base44.entities.SavedChart.get(tableId);
    if (!saved || saved.chart_type !== 'table') {
      return Response.json({ error: 'Table not found' }, { status: 404 });
    }

    // Check authorization
    if (saved.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = saved.chart_config || {};
    const data = config._rawData || [];
    const columns = config._columns || [];

    // Generate complete HTML with embedded CSS and JS
    const html = generateTableHTML(data, columns, config);

    const format = url.searchParams.get('format') || 'html';
    
    if (format === 'download') {
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(config.title)}.html"`
        }
      });
    }

    return Response.json({ html });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateTableHTML(data, columns, config) {
  const visibleCols = (config.visibleColumns || columns.map(c => c.name))
    .map(name => columns.find(c => c.name === name))
    .filter(Boolean);

  const aliases = config.columnAliases || {};
  const headerBg = config.headerBg || '#f4f4f5';
  const headerText = config.headerText || '#111827';
  const stripedColor = config.stripedColor || '#f9fafb';
  const hoverColor = config.hoverColor || '#f3f4f6';
  const borderColor = config.borderColor || '#e5e7eb';
  const tableBg = config.tableBg || '#ffffff';
  const numberColor = config.numberColor || '#2563eb';
  const fontSize = config.fontSize || 'sm';
  const cellPadding = config.compact ? '12px 8px' : '16px 10px';
  const textAlign = config.textAlign || 'left';
  const merges = config.merges || [];

  const fontsizeMap = { xs: '12px', sm: '14px', base: '16px' };
  const fsSize = fontsizeMap[fontSize] || '14px';

  const headerRow = visibleCols
    .map(col => `<th style="padding: ${cellPadding}; text-align: ${textAlign}; font-weight: 600; color: ${headerText}; border-bottom: 1px solid ${borderColor}; background: ${headerBg}; white-space: nowrap;">${aliases[col.name] || col.name}</th>`)
    .join('');

  const bodyRows = data
    .map((row, i) => {
      const isStriped = config.striped !== false && i % 2 === 1;
      const rowBg = isStriped ? stripedColor : tableBg;
      const cells = visibleCols
        .map((col, colIdx) => {
          if (isCellMerged(i, colIdx, merges)) return '';
          const mergeSpan = getCellMergeSpan(i, colIdx, merges);
          const val = row[col.name];
          const isNum = col.type === 'number';
          const cfColor = config.conditionalFormat && config.cfColumn === col.name
            ? getCfColor(val, config)
            : null;
          const rowspan = mergeSpan?.rowSpan || 1;
          const colspan = mergeSpan?.colSpan || 1;
          return `<td style="padding: ${cellPadding}; text-align: ${textAlign}; border-bottom: 1px solid ${borderColor}; background: ${cfColor || rowBg}; color: ${isNum && config.highlightNumbers ? numberColor : 'inherit'}; font-weight: ${isNum && config.highlightNumbers ? '500' : '400'};" rowspan="${rowspan}" colspan="${colspan}">${String(val ?? '')}</td>`;
        })
        .join('');
      return `<tr style="background: ${rowBg};">${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title || 'Table'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', sans-serif;
      background: ${tableBg};
      padding: 20px;
      color: #1f2937;
    }
    .table-container {
      max-width: 100%;
      background: ${tableBg};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .table-header {
      padding: 20px;
      border-bottom: 1px solid ${borderColor};
    }
    .table-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: ${headerText};
      margin-bottom: 8px;
    }
    .table-header p {
      font-size: 13px;
      color: #6b7280;
    }
    .search-wrapper {
      padding: 15px 20px;
      border-bottom: 1px solid ${borderColor};
      background: ${tableBg};
    }
    .search-input {
      width: 100%;
      max-width: 300px;
      padding: 8px 12px 8px 32px;
      font-size: 13px;
      border: 1px solid ${borderColor};
      border-radius: 8px;
      background: white url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>') no-repeat 10px center;
      outline: none;
    }
    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${fsSize};
    }
    th {
      text-align: ${textAlign};
      position: sticky;
      top: 0;
      z-index: 10;
    }
    tr {
      transition: background 0.2s;
    }
    tbody tr:hover {
      background: ${hoverColor} !important;
    }
    .table-footer {
      padding: 15px 20px;
      border-top: 1px solid ${borderColor};
      font-size: 12px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footnotes {
      padding: 15px 20px;
      border-top: 1px solid ${borderColor};
      background: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      color: #6b7280;
    }
    .footnote-item {
      margin-bottom: 8px;
    }
    .footnote-num {
      font-family: monospace;
      font-weight: 600;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="table-container">
    ${config.title ? `<div class="table-header">
      <h2>${config.title}</h2>
      ${config.subtitle ? `<p>${config.subtitle}</p>` : ''}
    </div>` : ''}
    
    ${config.showSearch !== false ? `<div class="search-wrapper">
      <input type="text" class="search-input" id="searchInput" placeholder="Søk i tabellen…">
    </div>` : ''}

    <div class="table-wrapper">
      <table id="dataTable">
        <thead>
          <tr style="background: ${headerBg};">
            ${config.showRowNumbers ? `<th style="padding: ${cellPadding}; text-align: ${textAlign}; font-weight: 600; color: ${headerText}; border-bottom: 1px solid ${borderColor}; background: ${headerBg}; white-space: nowrap;">#</th>` : ''}
            ${headerRow}
          </tr>
        </thead>
        <tbody id="tableBody">
          ${bodyRows}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span><span id="rowCount">${data.length}</span> rader</span>
      ${config.sourceText ? `<span>Kilde: ${config.sourceText}</span>` : ''}
    </div>

    ${config.footnotes && config.footnotes.length > 0 ? `<div class="footnotes">
      ${config.footnotes.map((note, i) => `<div class="footnote-item"><span class="footnote-num">${i + 1}.</span> ${note}</div>`).join('')}
    </div>` : ''}
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const rowCount = document.getElementById('rowCount');
    const allRows = Array.from(tableBody.querySelectorAll('tr'));

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let visibleCount = 0;
        
        allRows.forEach(row => {
          const text = row.textContent.toLowerCase();
          const isVisible = text.includes(query);
          row.style.display = isVisible ? '' : 'none';
          if (isVisible) visibleCount++;
        });

        rowCount.textContent = visibleCount;
      });
    }
  </script>
</body>
</html>`;

  return html;
}

function isCellMerged(rowIdx, colIdx, merges) {
  return merges.some(merge => {
    const [mr1, mc1, mr2, mc2] = merge.split('-').map(Number);
    return rowIdx >= mr1 && rowIdx <= mr2 && colIdx >= mc1 && colIdx <= mc2 && !(rowIdx === mr1 && colIdx === mc1);
  });
}

function getCellMergeSpan(rowIdx, colIdx, merges) {
  for (const merge of merges) {
    const [mr1, mc1, mr2, mc2] = merge.split('-').map(Number);
    if (rowIdx === mr1 && colIdx === mc1) {
      return { rowSpan: mr2 - mr1 + 1, colSpan: mc2 - mc1 + 1 };
    }
  }
  return null;
}

function getCfColor(value, config) {
  if (!config.conditionalFormat || !config.cfColumn) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  if (config.cfHigh !== undefined && config.cfHigh !== '' && n >= config.cfHigh) return config.cfHighColor || '#dcfce7';
  if (config.cfLow !== undefined && config.cfLow !== '' && n <= config.cfLow) return config.cfLowColor || '#fee2e2';
  return config.cfMidColor || '#fef9c3';
}

function sanitizeFilename(name) {
  return (name || 'table').replace(/[^a-z0-9]/gi, '_').toLowerCase();
}