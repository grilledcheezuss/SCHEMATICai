// api/search.js
export const config = {
    runtime: 'edge', // This forces Vercel to run it as a high-speed Edge function
};

export default async function handler(req) {
    // 1. CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 2. Handle Options (Pre-flight)
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 3. Parse Query Params
    const url = new URL(req.url);
    const table = url.searchParams.get('table');
    const health = url.searchParams.get('health');

    // 4. Health Check
    if (health === 'true') {
        return new Response(JSON.stringify({ status: "Online", mode: "Edge" }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 5. Security Config (Environment Variables)
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

    // 6. Validation
    if (!config) {
        return new Response(JSON.stringify({ error: `Table '${table}' not found.` }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!config.allowMethods.includes(req.method)) {
        return new Response(JSON.stringify({ error: `Method ${req.method} not allowed.` }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 7. Construct Airtable URL
    // Copy all params except 'table' and 'health'
    const newParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
        if (key !== 'table' && key !== 'health') newParams.append(key, value);
    });

    const airtableUrl = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${newParams.toString()}`;

    // 8. Fetch from Airtable
    try {
        const upstreamRes = await fetch(airtableUrl, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: req.method === 'POST' ? await req.text() : undefined
        });

        const data = await upstreamRes.json();
        
        return new Response(JSON.stringify(data), {
            status: upstreamRes.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy Error', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}