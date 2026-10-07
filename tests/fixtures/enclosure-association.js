// Synthetic record-like descriptions, not deployed Airtable records.
const excerpts = require('./parser-repair.js');

function description(materialCell) {
    return [
        'Duplex control panel drawing',
        excerpts.cp8328.panel,
        'Pump Manufacturer Sulzer Pump Model X100',
        excerpts.cp8328.motors,
        materialCell,
        'Enclosure Size 30x24x10 Inner Swing Panel Yes Control Sensor Floats',
        'Notes Stainless Steel screws and Painted Steel brackets; Fiberglass option',
        'Wiring CB4 1P M2 230V'
    ].join('\n');
}

function cells(material) {
    return [
        `Phase Monitor ${material.replace(' ', '\n')} Enclosure Material Panel Heater / Thermostat W`,
        `Phase Monitor CR1 5 ${material} Enclosure Material W = M2 23 Panel Heater / Thermostat W`,
        `Phase Monitor ${material} Enclosure Material 28 2 WAGO 285-137 GROUND TERMINAL Panel Heater / Thermostat W`,
        `Enclosure NEMA Rating 4X CR1 5 ${material} 29 3 WAGO 249-197 END BLOCK Enclosure Material Enclosure Size 30x24x10`,
        `Enclosure Material CR1 5 ${material} Inner Swing Panel Yes`,
        `Phase Monitor ${material} Enclosure Material Enclosure Size 30x24x10`
    ];
}

module.exports = { description, cells };
