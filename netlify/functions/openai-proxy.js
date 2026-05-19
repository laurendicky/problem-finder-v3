const OpenAI = require('openai');

const allowedOrigins = [
  'https://minky.ai', 'https://www.minky.ai',
  'https://problempop.io', 'https://www.problempop.io',
  'http://localhost:8888'
];

exports.handler = async (event) => {
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (allowedOrigins.includes(origin) || (origin && origin.includes('netlify.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const { openaiPayload } = JSON.parse(event.body);

    if (!apiKey) throw new Error('API Key missing.');

    const openai = new OpenAI({ apiKey, timeout: 60000 });

    // --- 2026 DOCUMENTATION MATCHING ---
    // 1. Rename max_tokens to match GPT-5 specs
    if (openaiPayload.max_tokens) {
      openaiPayload.max_completion_tokens = openaiPayload.max_tokens;
      delete openaiPayload.max_tokens;
    }

    // 2. Ensure model is exactly as listed in your OpenAI dashboard
    // This allows you to use 'gpt-5-mini' in your script
    
    // 3. Convert 'system' role to 'developer' for GPT-5 compatibility
    if (openaiPayload.messages) {
      openaiPayload.messages = openaiPayload.messages.map(m => 
        m.role === 'system' ? { ...m, role: 'developer' } : m
      );
    }

    const chatCompletion = await openai.chat.completions.create(openaiPayload);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openaiResponse: chatCompletion.choices[0].message.content,
        usage: chatCompletion.usage
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
