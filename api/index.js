// api/index.js
const https = require('https');

module.exports = async (req, res) => {
    // 1. CORS & Preflight Security
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow access from anywhere (or restrict to your domain)
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle standard OPTIONS request (Browser pre-check)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Parse URL Parameters
    // We expect ?table=Name&param=value
    const { table } = req.query;
    const method = req.method;

    // 3. Security Configuration
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

    // 4. Access Control Checks
    if (!config) {
        return res.status(404).json({ error: `Table '${table}' not recognized/authorized.` });
    }

    if (!config.allowMethods.includes(method)) {
        return res.status(405).json({ error: `Method ${method} not allowed for this table.` });
    }

    // 5. Construct Airtable URL
    // Filter out 'table' from the query params so we don't send it to Airtable
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'table') queryParams.append(key, value);
    }

    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${queryParams.toString()}`;

    // 6. Execute Request
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
        console.error("Proxy Error:", error);
        res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
    }
};