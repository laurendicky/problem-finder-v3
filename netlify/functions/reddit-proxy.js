// reddit-proxy.js - Node 20+ Stable Version for Web Apps
exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

    try {
        const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;

        if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
            throw new Error("Missing Reddit credentials in Netlify settings.");
        }

        // 1. Prepare credentials (cleaning accidental whitespace)
        const id = REDDIT_CLIENT_ID.trim();
        const secret = REDDIT_CLIENT_SECRET.trim();
        const agent = REDDIT_USER_AGENT ? REDDIT_USER_AGENT.trim() : 'ProblemFinder/1.0';

        // 2. Build the Auth Header (Standard for Node 20+)
        const authHeader = `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;

        // 3. Request the Access Token from Reddit
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': agent
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[Reddit Auth Error] ${tokenResponse.status}: ${errorText}`);
            return {
                statusCode: tokenResponse.status,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Reddit rejected credentials", details: errorText })
            };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 4. Parse the request from the frontend
        const body = JSON.parse(event.body);
        const { searchTerm, niche, limit = 25, timeFilter = 'all', after = null, type = 'search', subreddit = '' } = body;

        // 5. Construct the Reddit URL
        let url;
        if (type === 'about') {
            url = `https://oauth.reddit.com/r/${subreddit}/about`;
        } else {
            const query = niche ? `( ${searchTerm} ) ${niche}` : searchTerm;
            url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=${limit}&t=${timeFilter}&sort=relevance${after ? `&after=${after}` : ''}`;
        }

        // 6. Fetch data from Reddit
        const redditRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
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
        console.error("Proxy Crash:", err.message);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message })
        };
    }
};
