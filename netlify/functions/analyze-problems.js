const OpenAI = require('openai');
const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT, OPENAI_API_KEY } = process.env;

exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const { subredditQueryString, originalGroupName, searchTerms } = JSON.parse(event.body);
        
        // [Reddit fetching logic remains same...]
        // Assuming your existing Reddit helper functions are at the top of the file
        
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

        const openAIParams = {
            model: "gpt-5-mini",
            messages: [
                { 
                    role: "developer", // 2026 Standard
                    content: "You are a Market Research expert. Always return data in JSON format." // Added "JSON" word
                },
                { 
                    role: "user", 
                    content: `Analyze discussions for "${originalGroupName}". Return a JSON object with exactly 5 summaries.` 
                }
            ],
            response_format: { type: "json_object" }
        };

        const res = await openai.chat.completions.create(openAIParams);

        return {
            statusCode: 200,
            headers,
            body: res.choices[0].message.content
        };

    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
