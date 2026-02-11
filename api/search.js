// api/search.js

export default async function handler(req, res) {
    // 1. Security Check: Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Get the Search Terms from the User
    // The browser sends: /api/search?q=pd6000,triplex
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'No search terms provided' });
    }

    // 3. SECURELY Fetch Data from Airtable
    // The user NEVER sees this API key. It lives only on the server.
    const AIRTABLE_ID = 'appgc1pbuOgmODRpj';
    const TABLE_ID = 'tblLnVHfkYAWjfQzN';
    const API_KEY = process.env.AIRTABLE_API_KEY; // Loaded securely from Vercel

    try {
        // We fetch the data solely on the server
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_ID}/${TABLE_ID}?view=Grid%20view`, {
            headers: { Authorization: `Bearer ${API_KEY}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Database');
        }

        const data = await response.json();
        
        // 4. THE IP PROTECTION (Server-Side Filtering)
        // We perform the search logic HERE, so the full database never leaves the server.
        const searchTerms = q.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
        
        const filteredResults = data.records.filter(record => {
            const text = (record.fields['Items'] || '') + ' ' + (record.fields['Control Panel Name'] || '');
            const lowerText = text.toLowerCase();
            
            // Logic: Must match ALL keywords to be returned
            return searchTerms.every(term => lowerText.includes(term));
        });

        // 5. Return ONLY the matches to the user
        // We map the result to hide internal Airtable IDs or sensitive fields if necessary
        const sanitizedResults = filteredResults.map(r => ({
            id: r.id,
            fields: r.fields
        }));

        res.status(200).json({ results: sanitizedResults });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}