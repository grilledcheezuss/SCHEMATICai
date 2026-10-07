const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const evaluator = path.join(__dirname, 'system-type-evaluate.js');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'system-type-evaluate-'));
try {
    const csv = path.join(temp, 'labels.csv');
    fs.writeFileSync(csv, [
        'panel_id,app_result,ground_truth,gt_confidence,evidence_snippet,root_cause',
        'PRIVATE-PANEL-ID,Unknown,Duplex,high,"PRIVATE-CAD-DETAIL, PANEL DESCRIPTION | DUPLEX PUMP",adjective equipment',
        'CP-2,Triplex,Mixed,medium,"TRIPLEX ALTERNATOR RELAY",component'
    ].join('\r\n'));
    const snippet = spawnSync(process.execPath, [evaluator, csv], { encoding: 'utf8' });
    assert.strictEqual(snippet.status, 0, snippet.stderr);
    assert(snippet.stdout.includes('scope=SNIPPET_BENCHMARK; rows=2'));
    assert(snippet.stdout.includes('gt_confidence=HIGH=1, MEDIUM=1'));
    assert(snippet.stdout.includes('current parser: classified=1/2'));
    assert(snippet.stdout.includes('Duplex       1     0     0'));
    assert(!snippet.stdout.includes('PRIVATE-PANEL-ID'));
    assert(!snippet.stdout.includes('PRIVATE-CAD-DETAIL'));

    const json = path.join(temp, 'labels.json');
    fs.writeFileSync(json, JSON.stringify([{
        app_result: 'Simplex',
        ground_truth: 'Simplex',
        gt_confidence: 'reviewed',
        full_description: 'PANEL DESCRIPTION | SIMPLEX BLOWER',
        root_cause: 'verified label'
    }]));
    const full = spawnSync(process.execPath, [evaluator, json], { encoding: 'utf8' });
    assert.strictEqual(full.status, 0, full.stderr);
    assert(full.stdout.includes('scope=FULL_DESCRIPTION_INPUT; rows=1'));
    assert(full.stdout.includes('current parser: classified=1/1'));

    const missing = spawnSync(process.execPath, [evaluator], { encoding: 'utf8' });
    assert.strictEqual(missing.status, 2);
    assert(missing.stderr.includes('Usage:'));
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}

console.log('System Type local evaluator tests passed');
