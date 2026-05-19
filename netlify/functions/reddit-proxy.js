// reddit-proxy.js - MAY 2026 DIAGNOSTIC VERSION
exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

    try {
        const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;

        // 1. Precise Credential Trimming
        const id = REDDIT_CLIENT_ID.trim();
        const secret = REDDIT_CLIENT_SECRET.trim();
        // FORCE a very standard User-Agent format to bypass bot detection
        const agent = REDDIT_USER_AGENT ? REDDIT_USER_AGENT.trim() : "web:ProblemFinder:v1.0 (by /u/RubyFishSimon)";

        // 2. Auth Step
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

        // --- DIAGNOSTIC CHECK 1 ---
        const tokenRaw = await tokenResponse.text();
        if (!tokenResponse.ok) {
            console.error(`[Reddit Auth Error] Status: ${tokenResponse.status}. Body preview: ${tokenRaw.substring(0, 200)}`);
            throw new Error(`Reddit rejected credentials. Check Netlify logs for body.`);
        }
        const tokenData = JSON.parse(tokenRaw);

        // 3. Search Step
        const body = JSON.parse(event.body);
        const { searchTerm, niche, limit = 25, timeFilter = 'all', after = null, type = 'search', subreddit = '' } = body;

        let url = type === 'about' 
            ? `https://oauth.reddit.com/r/${subreddit}/about`
            : `https://oauth.reddit.com/search?q=${encodeURIComponent(niche ? `( ${searchTerm} ) ${niche}` : searchTerm)}&limit=${limit}&t=${timeFilter}&sort=relevance${after ? `&after=${after}` : ''}`;

        const redditRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': agent
            }
        });

        // --- DIAGNOSTIC CHECK 2 ---
        const searchRaw = await redditRes.text();
        if (!redditRes.ok) {
            console.error(`[Reddit Search Error] Status: ${redditRes.status}. Body preview: ${searchRaw.substring(0, 200)}`);
            throw new Error(`Reddit search failed with status ${redditRes.status}`);
        }

        // Final Return
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: searchRaw // It's already JSON text
        };

    } catch (err) {
        console.error("Proxy Crash Trace:", err.message);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message })
        };
    }
};
