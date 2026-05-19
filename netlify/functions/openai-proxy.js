const OpenAI = require('openai');

// --- 2026 UPDATED WHITELIST ---
const allowedOrigins = [
  'https://minky.ai',
  'https://www.minky.ai',
  'https://problempop.io',
  'https://www.problempop.io',
  'http://localhost:8888',
  // ADD YOUR NEW NETLIFY URL HERE (e.g., 'https://problem-finder-v3.netlify.app')
];

exports.handler = async (event) => {
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Dynamic Whitelisting: Grant access if origin matches or if it's a Netlify preview URL
  if (allowedOrigins.includes(origin) || (origin && origin.includes('netlify.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('API key missing in environment variables.');

    const { openaiPayload } = JSON.parse(event.body);
    if (!openaiPayload) throw new Error('No payload provided.');

    // --- 2026 SDK INITIALIZATION ---
    // We increase the timeout to 60s to handle massive 1M token context windows
    const openai = new OpenAI({ 
      apiKey,
      timeout: 60000 
    });

    console.log(`[2026 PROXY] Dispatching request to: ${openaiPayload.model}`);

    const chatCompletion = await openai.chat.completions.create({
      ...openaiPayload,
      // Ensure we utilize the 2026 'High Fidelity' JSON mode if requested
      response_format: openaiPayload.response_format || { type: "json_object" }
    });

    // Log the usage so you can track your profit margins in Netlify logs
    const usage = chatCompletion.usage;
    console.log(`[COST LOG] Tokens Used: ${usage.total_tokens} (Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens})`);
    if (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) {
        console.log(`[SAVINGS LOG] Cached Tokens: ${usage.prompt_tokens_details.cached_tokens} (90% discount applied!)`);
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openaiResponse: chatCompletion.choices[0].message.content,
        usage: usage // Send usage back so we can track it on the frontend too
      }),
    };
  } catch (error) {
    console.error('Proxy Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
