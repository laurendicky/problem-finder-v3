const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT, OPENAI_API_KEY } = process.env;

// --- 2026 Optimized Stopwords & Helpers ---
const stopWords = ["a","about","above","after","again","against","all","am","an","and","any","are","as","at","be","because","been","before","being","below","between","both","but","by","can't","cannot","could","did","do","does","doing","don't","down","during","each","few","for","from","further","had","has","have","having","he","her","here","hers","herself","him","himself","his","how","i","if","in","into","is","it","its","itself","let's","me","more","most","my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","she","should","so","some","such","than","that","the","their","theirs","them","themselves","then","there","these","they","this","those","through","to","too","under","until","up","very","was","we","were","what","when","where","which","while","who","whom","why","with","would","you","your","yours","yourself","yourselves","like","just","dont","can","people","help","really","even","know","still"];

function deduplicatePosts(posts) {
    const seen = new Set();
    return posts.filter(p => p.data && p.data.id && !seen.has(p.data.id) && seen.add(p.data.id));
}

async function getRedditToken() {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": REDDIT_USER_AGENT },
        body: "grant_type=client_credentials"
    });
    const data = await res.json();
    return data.access_token;
}

async function fetchRedditForTerm(query, niche, limit, time) {
    const token = await getRedditToken();
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(`( ${query} ) ${niche}`)}&limit=${limit}&t=${time}&sort=relevance`;
    const res = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}`, "User-Agent": REDDIT_USER_AGENT } });
    const data = await res.json();
    return data.data?.children || [];
}

// --- Main Handler ---
exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

    try {
        const { subredditQueryString, timeFilter, minUpvotes, originalGroupName, searchTerms } = JSON.parse(event.body);

        // 1. Fetch data from Reddit (Now faster in 2026)
        const fetchPromises = searchTerms.slice(0, 5).map(term => fetchRedditForTerm(term, subredditQueryString, 50, timeFilter));
        const results = await Promise.all(fetchPromises);
        let allPosts = deduplicatePosts(results.flat());

        // 2. Filter for Quality
        const filteredPosts = allPosts.filter(p => p.data.ups >= minUpvotes && (p.data.selftext || "").length > 50);
        if (filteredPosts.length < 5) throw new Error("Not enough high-quality discussions found for this audience.");

        // 3. Prepare for 2026 Long-Context Analysis
        // We increase from 30 posts to 100 posts because GPT-5.4-mini context is massive
        const analysisData = filteredPosts.slice(0, 100).map(p => `Title: ${p.data.title}\nContent: ${p.data.selftext.substring(0, 500)}`).join("\n---\n");

        // 4. Call OpenAI (Upgraded to GPT-5.4-mini)
        const openAIParams = {
            model: "gpt-5.4-mini",
            messages: [
                { 
                    role: "system", 
                    content: "You are a specialized Market Research agent. Analyze Reddit discussions to find exactly 5 recurring, high-intensity problems. Output ONLY valid JSON." 
                },
                { 
                    role: "user", 
                    content: `Analyze these discussions for "${originalGroupName}":\n\n${analysisData}\n\nReturn JSON: {"summaries": [{"title": "", "body": "", "count": 0, "quotes": ["quote1", "quote2", "quote3"], "keywords": []}]}` 
                }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        };

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify(openAIParams)
        });

        const aiData = await aiRes.json();
        
        // Log usage for your business tracking
        console.log(`[ANALYSIS LOG] Strategy completed using ${aiData.usage.total_tokens} tokens.`);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: aiData.choices[0].message.content
        };

    } catch (err) {
        console.error("Error:", err.message);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
    }
};
