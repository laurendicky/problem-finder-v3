// reddit-proxy.js - MAY 2026 STABLE VERSION (FOR WEB APPS)
exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

    try {
        const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;

        // 1. Clean Credentials
        const id = REDDIT_CLIENT_ID.trim();
        const secret = REDDIT_CLIENT_SECRET.trim();
        const agent = REDDIT_USER_AGENT.trim();

        // 2. Get Access Token
        const authHeader = `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': agent
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) throw new Error(`Reddit Auth Failed: ${tokenResponse.status}`);

        // 3. Parse Frontend Request
        const body = JSON.parse(event.body);
        const { searchTerm, niche, limit = 25, timeFilter = 'all', after = null, type = 'about', subreddit = '' } = body;

        // 4. Construct URL (FIXED: REMOVED .json)
        let url;
        if (type === 'about') {
            url = `https://oauth.reddit.com/r/${subreddit}/about`;
        } else {
            const query = niche ? `( ${searchTerm} ) ${niche}` : searchTerm;
            url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=${limit}&t=${timeFilter}&sort=relevance`;
            if (after) url += `&after=${after}`;
        }

        // 5. Fetch from Reddit
        const redditRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': agent
            }
        });

        const data = await redditRes.json();
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(data)
        };

    } catch (err) {
        console.error("Reddit Proxy Error:", err.message);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message })
        };
    }
};
