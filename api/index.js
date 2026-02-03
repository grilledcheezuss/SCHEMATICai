// api/index.js
export default async function handler(req, res) {
    // 1. Manually parse the URL to get the Table Name
    // Request URL: /api/TableName?param=value
    const { url } = req;
    const urlParts = url.split('?')[0].split('/'); // Split by "/"
    // urlParts = ["", "api", "Feedback"]
    const table = decodeURIComponent(urlParts[2]); // Get the 3rd part
    
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

    // 2. Validate Access
    if (!config) {
        return res.status(404).json({ error: `Table '${table}' not found or access denied.` });
    }

    if (!config.allowMethods.includes(method)) {
        return res.status(405).json({ error: `Method ${method} not allowed.` });
    }

    // 3. Construct Airtable URL
    // We grab the query string manually
    const queryString = url.split('?')[1] || '';
    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${queryString}`;

    // 4. Forward Request
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