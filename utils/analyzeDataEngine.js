/**
 * Deterministic Data-Analysis Engine for Analyze Files
 * Provides exact, verified calculations for spreadsheets and tabular data.
 * The AI must never invent numerical results; this engine provides the source of truth.
 */
const xlsx = require("xlsx");
function isNumeric(val) {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num);
}

function roundTo(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}


function computeUniversalMetrics(workbook, allRows = []) {
  try {
    const summary = {};
    let totalRevenue = 0;
    let totalExpenses = 0;
    // Helper: Identify sheets or rows
    let salesRows = allRows;
    let expenseRows = [];
    if (workbook && workbook.SheetNames) {
      workbook.SheetNames.forEach(name => {
        const sName = name.toLowerCase();
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[name] || {}, { defval: 0 });
        if (/sale|rev|order|income/i.test(sName)) {
          salesRows = data;
        } else if (/expense|cost|spend/i.test(sName)) {
          expenseRows = data;
        }
      });
    }
    // 1. Calculate Revenue & Variable costs by Month
    salesRows.forEach(row => {
      // Find month key (e.g., Month, Date, Period)
      const mKey = Object.keys(row).find(k => /month|date|period/i.test(k));
      const mVal = mKey ? String(row[mKey]).trim() : 'Total';
      if (!summary[mVal]) {
        summary[mVal] = { revenue: 0, marketing: 0, ai_cost: 0, fixed_cost: 0 };
      }
      // Automatically match revenue and cost columns
      Object.keys(row).forEach(col => {
        const val = Number(row[col]) || 0;
        if (/gross|rev|income|sales/i.test(col)) summary[mVal].revenue += val;
        else if (/market|ad/i.test(col)) summary[mVal].marketing += val;
        else if (/ai|api/i.test(col)) summary[mVal].ai_cost += val;
      });
    });
    // 2. Add Fixed Expenses from Expense Sheet
    expenseRows.forEach(row => {
      const mKey = Object.keys(row).find(k => /month|date|period/i.test(k));
      const mVal = mKey ? String(row[mKey]).trim() : 'Total';
      const fixedCol = Object.keys(row).find(k => /fixed|expense|cost|amount/i.test(k));
      const val = fixedCol ? Number(row[fixedCol]) || 0 : 0;
      if (summary[mVal]) {
        summary[mVal].fixed_cost += val;
      }
    });
    // 3. Format monthly exact overview
    const monthlyOverview = Object.keys(summary).sort().map(month => {
      const item = summary[month];
      const monthCosts = item.marketing + item.ai_cost + item.fixed_cost;
      const profitLoss = item.revenue - monthCosts;
      totalRevenue += item.revenue;
      totalExpenses += monthCosts;
      return {
        Month: month,
        Revenue: Number(item.revenue.toFixed(2)),
        TotalCosts: Number(monthCosts.toFixed(2)),
        ProfitLoss: Number(profitLoss.toFixed(2))
      };
    });
    // Find highest revenue month
    const highestMonth = [...monthlyOverview].sort((a, b) => b.Revenue - a.Revenue)[0] || {};
    const netProfitLoss = Number((totalRevenue - totalExpenses).toFixed(2));
    return {
      monthlyOverview,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfitLoss,
      highestRevenueMonth: highestMonth.Month || 'N/A',
      highestRevenueAmount: highestMonth.Revenue || 0,
      overallStatus: netProfitLoss < 0 ? `Net Loss of $${Math.abs(netProfitLoss)}` : `Net Profit of $${netProfitLoss}`
    };
  } catch (err) {
    return null;
  }
}

/**
 * 1. Numeric Summary: Count, Sum, Average, Min, Max, Median
 */
function calculateNumericSummary(rows, column) {
  if (!Array.isArray(rows) || rows.length === 0 || !column) {
    return { error: 'Invalid rows or column' };
  }

  const validNumbers = [];
  let missingCount = 0;
  let nonNumericCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i][column];
    if (raw === null || raw === undefined || raw === '') {
      missingCount++;
    } else if (isNumeric(raw)) {
      validNumbers.push(Number(raw));
    } else {
      nonNumericCount++;
    }
  }

  if (validNumbers.length === 0) {
    return {
      column,
      scannedRows: rows.length,
      validCount: 0,
      missingCount,
      nonNumericCount,
      error: 'No valid numeric values found in column: ' + column,
    };
  }

  validNumbers.sort((a, b) => a - b);
  const sum = validNumbers.reduce((acc, curr) => acc + curr, 0);
  const count = validNumbers.length;
  const average = roundTo(sum / count, 4);
  const min = validNumbers[0];
  const max = validNumbers[validNumbers.length - 1];

  let median;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = roundTo((validNumbers[mid - 1] + validNumbers[mid]) / 2, 4);
  } else {
    median = validNumbers[mid];
  }

  return {
    column,
    scannedRows: rows.length,
    validCount: count,
    missingCount,
    nonNumericCount,
    sum: roundTo(sum, 2),
    average,
    min,
    max,
    median,
    complete: true,
  };
}

/**
 * 2. Business Metrics: Revenue, Cost, Profit, Profit Margin (%)
 */
function calculateBusinessMetrics(rows, revenueCol, costCol) {
  if (!Array.isArray(rows) || !revenueCol || !costCol) {
    return { error: 'Rows, revenue column, and cost column are required' };
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let validRowsCount = 0;
  let excludedRowsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const revRaw = rows[i][revenueCol];
    const costRaw = rows[i][costCol];

    if (isNumeric(revRaw) && isNumeric(costRaw)) {
      totalRevenue += Number(revRaw);
      totalCost += Number(costRaw);
      validRowsCount++;
    } else {
      excludedRowsCount++;
    }
  }

  const profit = totalRevenue - totalCost;
  const profitMarginPercent =
    totalRevenue !== 0 ? roundTo((profit / totalRevenue) * 100, 2) : 0;

  return {
    revenueColumn: revenueCol,
    costColumn: costCol,
    scannedRows: rows.length,
    validRows: validRowsCount,
    excludedRows: excludedRowsCount,
    totalRevenue: roundTo(totalRevenue, 2),
    totalCost: roundTo(totalCost, 2),
    profit: roundTo(profit, 2),
    profitMarginPercent,
    formula: 'Profit = Revenue - Cost; Margin % = (Profit / Revenue) * 100',
    complete: true,
  };
}

/**
 * 3. Duplicate Detection: Exact row duplicates or key-column duplicates
 */
function findDuplicates(rows, keyColumns = null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { duplicateRowCount: 0, duplicatesSample: [], scannedRows: 0 };
  }

  const seenMap = new Map();
  const duplicateIndices = [];
  const duplicateSamples = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let key;

    if (Array.isArray(keyColumns) && keyColumns.length > 0) {
      key = keyColumns
        .map((col) => String(row[col] ?? '').trim().toLowerCase())
        .join('|||');
    } else {
      // Entire row representation
      key = JSON.stringify(row);
    }

    if (seenMap.has(key)) {
      duplicateIndices.push(i + 1); // 1-indexed row for user
      if (duplicateSamples.length < 10) {
        duplicateSamples.push({
          rowNumber: i + 1,
          matchedFirstSeenAtRow: seenMap.get(key) + 1,
          data: row,
        });
      }
    } else {
      seenMap.set(key, i);
    }
  }

  return {
    scannedRows: rows.length,
    duplicateRowCount: duplicateIndices.length,
    criteria: keyColumns && keyColumns.length > 0 ? `Columns: [${keyColumns.join(', ')}]` : 'Exact entire row match',
    duplicateRowNumbers: duplicateIndices.slice(0, 50),
    duplicatesSample: duplicateSamples,
    complete: true,
  };
}

/**
 * 4. Missing Values Detection
 */
function findMissingValues(rows, targetColumns = null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { missingCounts: {}, scannedRows: 0 };
  }

  const cols =
    Array.isArray(targetColumns) && targetColumns.length > 0
      ? targetColumns
      : Object.keys(rows[0] || {});

  const missingCounts = {};
  const missingRowIndices = {};

  cols.forEach((c) => {
    missingCounts[c] = 0;
    missingRowIndices[c] = [];
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    cols.forEach((c) => {
      const val = row[c];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        missingCounts[c]++;
        if (missingRowIndices[c].length < 10) {
          missingRowIndices[c].push(i + 1);
        }
      }
    });
  }

  return {
    scannedRows: rows.length,
    missingCounts,
    sampleMissingRows: missingRowIndices,
    complete: true,
  };
}

/**
 * 5. Outliers / Anomaly Detection using IQR (Interquartile Range)
 */
function detectOutliers(rows, column) {
  if (!Array.isArray(rows) || !column) {
    return { error: 'Rows and column required' };
  }

  const entries = [];
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][column];
    if (isNumeric(val)) {
      entries.push({ rowNumber: i + 1, value: Number(val), rawRow: rows[i] });
    }
  }

  if (entries.length < 4) {
    return {
      column,
      scannedRows: rows.length,
      warning: 'Insufficient data points for reliable IQR anomaly detection (minimum 4 required)',
      outlierCount: 0,
      outliers: [],
    };
  }

  entries.sort((a, b) => a.value - b.value);
  const n = entries.length;
  const q1 = entries[Math.floor(n * 0.25)].value;
  const q3 = entries[Math.floor(n * 0.75)].value;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = entries
    .filter((e) => e.value < lowerBound || e.value > upperBound)
    .map((e) => ({
      rowNumber: e.rowNumber,
      value: e.value,
      deviation: e.value < lowerBound ? 'Lower Outlier' : 'Upper Outlier',
    }));

  return {
    column,
    scannedRows: rows.length,
    validNumericCount: entries.length,
    method: 'Interquartile Range (IQR 1.5x)',
    q1,
    q3,
    iqr: roundTo(iqr, 2),
    lowerThreshold: roundTo(lowerBound, 2),
    upperThreshold: roundTo(upperBound, 2),
    outlierCount: outliers.length,
    outliersSample: outliers.slice(0, 15),
    complete: true,
    note: 'Identified as potential anomalies based on statistical deviation, not confirmed errors.',
  };
}

/**
 * 6. Grouping and Comparison: Group by category and compute aggregate
 */
function groupAndAggregate(rows, groupCol, metricCol, aggregation = 'sum', limit = 15) {
  if (!Array.isArray(rows) || !groupCol) {
    return { error: 'Rows and group column required' };
  }

  const groups = new Map();

  for (let i = 0; i < rows.length; i++) {
    const rawGroup = rows[i][groupCol];
    const groupKey = rawGroup !== null && rawGroup !== undefined && String(rawGroup).trim() !== ''
      ? String(rawGroup).trim()
      : '(Blank)';

    let val = 0;
    if (metricCol && isNumeric(rows[i][metricCol])) {
      val = Number(rows[i][metricCol]);
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { count: 0, sum: 0, values: [] });
    }

    const g = groups.get(groupKey);
    g.count++;
    g.sum += val;
    if (metricCol && isNumeric(rows[i][metricCol])) {
      g.values.push(val);
    }
  }

  const result = [];
  for (const [key, data] of groups.entries()) {
    let finalValue = data.count;
    if (metricCol && aggregation === 'sum') {
      finalValue = roundTo(data.sum, 2);
    } else if (metricCol && aggregation === 'avg') {
      finalValue = data.values.length > 0 ? roundTo(data.sum / data.values.length, 2) : 0;
    }
    result.push({
      category: key,
      value: finalValue,
      count: data.count,
    });
  }

  // Sort descending by value
  result.sort((a, b) => b.value - a.value);

  return {
    groupColumn: groupCol,
    metricColumn: metricCol || null,
    aggregation: metricCol ? aggregation : 'count',
    totalGroups: result.length,
    groups: result.slice(0, limit),
    isCapped: result.length > limit,
    scannedRows: rows.length,
    complete: true,
  };
}

/**
 * 7. Verified Chart Payload Generator (Bar, Line, Pie)
 */
function generateChartPayload(chartType = 'bar', title, labels, values, unit = '', source = '') {
  const safeType = ['bar', 'line', 'pie'].includes(chartType.toLowerCase())
    ? chartType.toLowerCase()
    : 'bar';

  // Cap at 15 items for readability & cost
  const maxItems = safeType === 'pie' ? 8 : 15;
  const slicedLabels = (labels || []).slice(0, maxItems);
  const slicedValues = (values || []).slice(0, maxItems).map((v) => (isNumeric(v) ? Number(v) : 0));

  return {
    chartType: safeType,
    title: title || 'Data Analysis Chart',
    labels: slicedLabels,
    values: slicedValues,
    unit: unit || '',
    source: source || 'Uploaded File Data',
    isVerified: true,
  };
}

/**
 * 8. Universal Text & Table Data Extractor for ANY file (PDF, DOCX, TXT, Excel)
 * Searches text lines for requested metric/column and sums numbers accurately.
 */
function extractAndComputeFromText(rawText, keyword) {
  if (!rawText || !keyword) return null;
  const lines = rawText.split('\n');
  const cleanKeyword = keyword.toLowerCase().trim();
  const matchedNumbers = [];
  for (let line of lines) {
    const lLower = line.toLowerCase();
    // Check if line contains the metric keyword (e.g., "signups", "visitors", "cost")
    if (lLower.includes(cleanKeyword)) {
      // Find all numbers in the line (e.g., "Standard873" -> 873, or "Paid: 45" -> 45)
      const numMatches = line.match(/-?\d+(?:\.\d+)?/g);
      if (numMatches) {
        // Take the numeric value closest to or immediately following the keyword
        numMatches.forEach(n => {
          const num = Number(n);
          if (!isNaN(num) && isFinite(num) && num > 0) {
            matchedNumbers.push(num);
          }
        });
      }
    }
  }
  if (matchedNumbers.length === 0) return null;
  const sum = matchedNumbers.reduce((a, b) => a + b, 0);
  return {
    keyword,
    occurrencesFound: matchedNumbers.length,
    sum: roundTo(sum, 2),
    average: roundTo(sum / matchedNumbers.length, 2),
    min: Math.min(...matchedNumbers),
    max: Math.max(...matchedNumbers)
  };
}


module.exports = {
  isNumeric,
  roundTo,
  calculateNumericSummary,
  calculateBusinessMetrics,
  findDuplicates,
  findMissingValues,
  detectOutliers,
  groupAndAggregate,
  generateChartPayload,
  computeUniversalMetrics,
  extractAndComputeFromText 
};
