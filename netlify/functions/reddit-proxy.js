// reddit-proxy.js - MAY 2026 FINAL STABLE VERSION
exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

    try {
        const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;

        // 1. Auth Step
        const authHeader = `Basic ${Buffer.from(`${REDDIT_CLIENT_ID.trim()}:${REDDIT_CLIENT_SECRET.trim()}`).toString('base64')}`;
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': REDDIT_USER_AGENT.trim()
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) throw new Error(`Reddit Auth Failed: ${tokenResponse.status}`);

        // 2. Parse Frontend Request
        const body = JSON.parse(event.body);
        // FIX: Default type is now 'search' to match your tool's main function
        const { searchTerm, niche, limit = 25, timeFilter = 'all', after = null, type = 'search', subreddit = '' } = body;

        // 3. Construct URL
        let url;
        if (type === 'about' && subreddit) {
            url = `https://oauth.reddit.com/r/${subreddit}/about`;
        } else {
            const query = niche ? `( ${searchTerm} ) ${niche}` : searchTerm;
            url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=${limit}&t=${timeFilter}&sort=relevance`;
            if (after) url += `&after=${after}`;
        }

        console.log(`[REDDIT PROXY] Calling: ${url}`);

        // 4. Fetch from Reddit
        const redditRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': REDDIT_USER_AGENT.trim()
            }
        });

        // 5. Check if response is valid JSON
        const contentType = redditRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorText = await redditRes.text();
            console.error(`[REDDIT ERROR] Expected JSON but got HTML. URL: ${url}`);
            throw new Error(`Reddit returned a webpage instead of data. Check Netlify logs.`);
        }

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
