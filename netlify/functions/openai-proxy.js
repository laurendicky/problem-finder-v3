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

    if (!apiKey) throw new Error('API Key missing in Netlify Environment Variables.');

    const openai = new OpenAI({ apiKey, timeout: 60000 });

    // --- 2026 SAFETY ADAPTATION ---
    // 1. Swap 'system' for 'developer' role (GPT-5 Standard)
    if (openaiPayload.messages) {
      openaiPayload.messages = openaiPayload.messages.map(m => 
        m.role === 'system' ? { ...m, role: 'developer' } : m
      );

      // 2. Ensure "JSON" is in the prompt if JSON mode is on
      if (openaiPayload.response_format?.type === 'json_object') {
        const hasJsonWord = JSON.stringify(openaiPayload.messages).toLowerCase().includes('json');
        if (!hasJsonWord) {
          openaiPayload.messages[0].content += " Respond in JSON format.";
        }
      }
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
    // CRITICAL: We now return the actual error message so you can see it in the browser console
    console.error('2026 Proxy Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "OpenAI Proxy Failed", 
        message: error.message,
        suggestion: "Check your OPENAI_API_KEY in Netlify Site Settings." 
      }),
    };
  }
};
