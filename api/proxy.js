// api/proxy.js
export default async function handler(req, res) {
    // 1. Get the URL path (e.g., "/api/Feedback")
    const { url } = req;
    
    // 2. Parse the Table Name
    // We expect the URL to look like "/api/TableName?param=value"
    // We split by "/" and grab the part after "api"
    const parts = url.split('/');
    const apiIndex = parts.indexOf('api');
    
    // Safety check: if "api" isn't found or there's nothing after it
    if (apiIndex === -1 || !parts[apiIndex + 1]) {
        return res.status(400).json({ error: "Invalid API URL structure." });
    }

    // "Feedback" or "Control%20Panel%20Items" (Remove query string ?...)
    const tableRaw = parts[apiIndex + 1].split('?')[0]; 
    const table = decodeURIComponent(tableRaw);

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

    // 3. Access Control
    if (!config) {
        return res.status(404).json({ error: `Table '${table}' not recognized.` });
    }
    
    if (!config.allowMethods.includes(req.method)) {
        return res.status(405).json({ error: `Method ${req.method} not allowed.` });
    }

    // 4. Forward to Airtable
    const queryString = url.split('?')[1] || '';
    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${queryString}`;

    try {
        const options = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (req.method === 'POST') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(airtableUrl, options);
        const data = await response.json();
        
        res.status(response.status).json(data);

    } catch (error) {
        res.status(500).json({ error: 'Proxy Error', details: error.message });
    }
}