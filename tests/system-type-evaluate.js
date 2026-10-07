#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('../info-table-parser.js');

const unknownLabels = new Set(['', 'UNKNOWN', 'UNCLASSIFIED', 'ABSENT', 'NONE', 'NULL', 'N/A', 'NA', 'MIXED']);
const fullDescriptionFields = ['full_description', 'description', 'raw_desc', 'desc'];

function parseCsv(source) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (quoted) {
            if (ch === '"' && source[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                quoted = false;
            } else {
                field += ch;
            }
        } else if (ch === '"' && field === '') {
            quoted = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && source[i + 1] === '\n') i++;
            row.push(field);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }
    if (quoted) throw new Error('CSV contains an unterminated quoted field');
    if (field || row.length) {
        row.push(field);
        if (row.some(value => value.trim())) rows.push(row);
    }
    if (!rows.length) throw new Error('Input has no header or data rows');
    const headers = rows.shift().map((value, index) => (index ? value : value.replace(/^\uFEFF/, '')).trim().toLowerCase());
    if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate column names');
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function readRows(file) {
    const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const trimmed = content.trimStart();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const value = JSON.parse(content);
        const rows = Array.isArray(value) ? value : value && value.records;
        if (!Array.isArray(rows)) throw new Error('JSON input must be an array or contain a records array');
        return rows.map(row => Object.fromEntries(Object.entries(row || {}).map(([key, entry]) => [key.toLowerCase(), entry])));
    }
    return parseCsv(content);
}

function getValue(row, names) {
    for (const name of names) if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
    return '';
}

function normalizeLabel(value, rowNumber, field) {
    const label = value == null ? '' : String(value).trim();
    if (unknownLabels.has(label.toUpperCase())) return null;
    const canonical = parser.normalizeSystemType(label);
    if (canonical) return canonical;
    const found = parser.SYSTEM_TYPES.filter(type => new RegExp(`\\b${type.toUpperCase()}\\b`, 'i').test(label));
    if (found.length === 1) return found[0];
    throw new Error(`row ${rowNumber}: ${field} is not a recognized system type or abstention label`);
}

function safeCategory(value) {
    const text = String(value || '').trim().toUpperCase()
        .replace(/\b(?:HTTPS?:\/\/|WWW\.)\S+/g, '[URL]')
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
        .replace(/\b\d{2,}\b/g, '#')
        .replace(/[^A-Z0-9 _./-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (text || '(UNSPECIFIED)').slice(0, 40);
}

function score(rows, predicted) {
    const classes = {};
    let classified = 0;
    rows.forEach((row, index) => {
        const guess = predicted(row, index);
        if (guess) classified++;
        for (const type of parser.SYSTEM_TYPES) {
            const truth = row.truth === type;
            const match = guess === type;
            const counts = classes[type] || (classes[type] = { tp: 0, fp: 0, fn: 0 });
            if (match && truth) counts.tp++;
            else if (match) counts.fp++;
            else if (truth) counts.fn++;
        }
    });
    const totals = Object.values(classes).reduce((sum, item) => ({
        tp: sum.tp + item.tp, fp: sum.fp + item.fp, fn: sum.fn + item.fn
    }), { tp: 0, fp: 0, fn: 0 });
    return { classes, classified, totals, totalRows: rows.length };
}

function rate(numerator, denominator) {
    return denominator ? `${(100 * numerator / denominator).toFixed(2)}%` : 'n/a';
}

function printScores(name, result) {
    const { tp, fp, fn } = result.totals;
    console.log(`${name}: classified=${result.classified}/${result.totalRows} micro-precision=${rate(tp, tp + fp)} micro-recall=${rate(tp, tp + fn)}`);
    console.log('  type       TP    FP    FN  precision  recall');
    for (const type of parser.SYSTEM_TYPES) {
        const item = result.classes[type];
        console.log(`  ${type.padEnd(10)} ${String(item.tp).padStart(3)}   ${String(item.fp).padStart(3)}   ${String(item.fn).padStart(3)}  ${rate(item.tp, item.tp + item.fp).padStart(9)}  ${rate(item.tp, item.tp + item.fn)}`);
    }
}

function evaluate(inputRows) {
    if (!inputRows.length) throw new Error('Input contains no data rows');
    const rows = inputRows.map((raw, index) => {
        const row = Object.fromEntries(Object.entries(raw || {}).map(([key, value]) => [key.toLowerCase(), value]));
        const truthValue = getValue(row, ['ground_truth']);
        const truth = normalizeLabel(truthValue, index + 2, 'ground_truth');
        const supplied = normalizeLabel(getValue(row, ['app_result']), index + 2, 'app_result');
        const descriptionField = fullDescriptionFields.find(name => Object.prototype.hasOwnProperty.call(row, name));
        const snippetField = Object.prototype.hasOwnProperty.call(row, 'evidence_snippet') ? 'evidence_snippet' : null;
        const field = descriptionField || snippetField;
        if (!field || row[field] == null) throw new Error(`row ${index + 2}: expected a description or evidence_snippet column`);
        const desc = String(row[field]);
        const record = { desc };
        parser.deriveRecord(record);
        return {
            truth,
            truthCategory: String(truthValue == null ? '' : truthValue).trim().toUpperCase() === 'MIXED'
                ? 'Mixed' : truth || 'Unknown',
            supplied,
            derived: record._sys,
            confidence: safeCategory(getValue(row, ['gt_confidence']) || '(unspecified)'),
            rootCause: safeCategory(getValue(row, ['root_cause']) || '(unspecified)'),
            snippet: field === 'evidence_snippet'
        };
    });
    const snippetRows = rows.filter(row => row.snippet).length;
    const fullRows = rows.length - snippetRows;
    const scope = snippetRows && fullRows ? 'MIXED_INPUT' : snippetRows ? 'SNIPPET_BENCHMARK' : 'FULL_DESCRIPTION_INPUT';
    const supplied = score(rows, row => row.supplied);
    const derived = score(rows, row => row.derived);
    const counts = values => Object.entries(values).sort(([a], [b]) => a.localeCompare(b))
        .map(([label, count]) => `${label}=${count}`).join(', ') || '(none)';
    const truthCounts = {};
    const confidenceCounts = {};
    const causeCounts = {};
    rows.forEach(row => {
        truthCounts[row.truthCategory] = (truthCounts[row.truthCategory] || 0) + 1;
        confidenceCounts[row.confidence] = (confidenceCounts[row.confidence] || 0) + 1;
        causeCounts[row.rootCause] = (causeCounts[row.rootCause] || 0) + 1;
    });
    console.log(`scope=${scope}; rows=${rows.length}; full_description_inputs=${fullRows}; evidence_snippets=${snippetRows}`);
    console.log('This measures only supplied rows and labels; snippet results are not full-record accuracy. No live catalog targets are verified.');
    console.log(`ground_truth=${counts(truthCounts)}`);
    console.log(`gt_confidence=${counts(confidenceCounts)}`);
    console.log(`root_cause=${counts(causeCounts)}`);
    printScores('supplied app_result', supplied);
    printScores('current parser', derived);
    console.log(`Unclassified current-parser rows=${rows.length - derived.classified}`);
}

if (require.main === module) {
    const file = process.argv[2];
    if (!file || process.argv.length > 3) {
        console.error('Usage: node tests/system-type-evaluate.js <local-labels.csv|json>');
        process.exitCode = 2;
    } else {
        try {
            evaluate(readRows(path.resolve(file)));
        } catch (error) {
            console.error(`System Type evaluation failed: ${error.message}`);
            process.exitCode = 1;
        }
    }
}

module.exports = { evaluate, parseCsv, readRows };
