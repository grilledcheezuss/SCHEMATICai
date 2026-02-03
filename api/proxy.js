// api/proxy.js
// Access at: /api/proxy
const https = require('https');

module.exports = async (req, res) => {
    // 1. CORS Headers (Allow your frontend to connect)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Handle Browser Pre-flight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Health Check (Run this in browser to test backend)
    if (req.query.health === 'true') {
        return res.status(200).json({ status: "Online", node: process.version });
    }

    const { table } = req.query;
    const method = req.method;

    // 4. Security Whitelist
    const TABLE_CONFIG = {
        'Control Panel Items': {
            baseId: process.env.AIRTABLE_MAIN_BASE,
            apiKey: process.env.AIRTABLE_READ_KEY,
            allowMethods: ['GET']
        },
        'Feedback': {
            baseId: process.env.AIRTABLE_FEEDBACK_BASE,
            apiKey: process.env.AIRTABLE_WRITE_KEY,
            allowMethods: ['GET', 'POST']
        }
    };

    const config = TABLE_CONFIG[table];

    if (!config) {
        return res.status(404).json({ error: `Table '${table}' not found.` });
    }

    // 5. Proxy Request
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'table' && key !== 'health') queryParams.append(key, value);
    }

    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${queryParams.toString()}`;

    try {
        const response = await fetch(airtableUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: method === 'POST' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Proxy Error', details: error.message });
    }
};