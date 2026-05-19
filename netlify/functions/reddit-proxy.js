// No external 'fetch' library needed - Node 20+ handles it natively

async function getRedditToken() {
    const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
    
    // Safety check: ensure variables exist
    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
        throw new Error("Missing Reddit credentials in Netlify environment variables.");
    }

    const authString = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    
    try {
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': REDDIT_USER_AGENT || 'ProblemPulse/1.0'
            },
            // 2026 Standard: Using URLSearchParams for cleaner form data
            body: new URLSearchParams({ 'grant_type': 'client_credentials' })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[REDDIT AUTH ERROR] ${response.status}: ${errText}`);
            throw new Error(`Reddit Auth Failed: ${response.status}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Reddit Token Exception:', error.message);
        throw error;
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    try {
        const token = await getRedditToken();
        const body = JSON.parse(event.body);
        const { searchTerm, niche, limit = 25, timeFilter = 'all', after = null, type = 'search', subreddit = '' } = body;

        let url;
        if (type === 'about') {
            url = `https://oauth.reddit.com/r/${subreddit}/about`;
        } else {
            const query = niche ? `( ${searchTerm} ) ${niche}` : searchTerm;
            url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=${limit}&t=${timeFilter}&sort=relevance${after ? `&after=${after}` : ''}`;
        }

        const redditRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': process.env.REDDIT_USER_AGENT || 'ProblemPulse/1.0'
            }
        });

        const data = await redditRes.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (err) {
        console.error("Reddit Proxy Handler Error:", err.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
