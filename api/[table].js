// api/[table].js
export default async function handler(req, res) {
    const { table } = req.query;
    const method = req.method;

    // 🔒 SECURITY CONFIGURATION
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

    if (!config.allowMethods.includes(method)) {
        return res.status(405).json({ error: `Method ${method} not allowed.` });
    }

    // Clean Query Params
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'table') queryParams.append(key, value);
    }

    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${queryParams.toString()}`;

    try {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (method === 'POST') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(airtableUrl, options);
        const data = await response.json();
        
        res.status(response.status).json(data);

    } catch (error) {
        res.status(500).json({ error: 'Proxy Error', details: error.message });
    }
}