const OpenAI = require('openai');

const allowedOrigins = [
  'https://minky.ai', 'https://www.minky.ai',
  'https://problempop.io', 'https://www.problempop.io',
  'http://localhost:8888'
];

exports.handler = async (event) => {
  const origin = event.headers.origin;
  const headers = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (allowedOrigins.includes(origin) || (origin && origin.includes('netlify.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const { openaiPayload } = JSON.parse(event.body);
    const openai = new OpenAI({ apiKey, timeout: 60000 });

    // --- 2026 SPEED & TIMEOUT OPTIMIZATION ---
    
    // 1. If it's a quick task (Keywords/Subs), force LOW reasoning to avoid Netlify timeouts
    if (!openaiPayload.reasoning_effort) {
        openaiPayload.reasoning_effort = "low"; 
    }

    // 2. Role and Token Fixes
    if (openaiPayload.messages) {
      openaiPayload.messages = openaiPayload.messages.map(m => 
        m.role === 'system' ? { ...m, role: 'developer' } : m
      );
    }
    if (openaiPayload.max_tokens) {
      openaiPayload.max_completion_tokens = openaiPayload.max_tokens;
      delete openaiPayload.max_tokens;
    }

    const chatCompletion = await openai.chat.completions.create(openaiPayload);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openaiResponse: chatCompletion.choices[0].message.content
      }),
    };
  } catch (error) {
    console.error('2026 Proxy Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
