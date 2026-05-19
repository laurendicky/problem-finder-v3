const OpenAI = require('openai');

// --- 1. CONFIGURATION ---
const allowedOrigins = [
  'https://minky.ai', 
  'https://www.minky.ai',
  'https://problempop.io', 
  'https://www.problempop.io',
  'http://localhost:8888'
];

exports.handler = async (event) => {
  // Setup CORS Headers
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Allow your domains + any Netlify preview URL
  if (allowedOrigins.includes(origin) || (origin && origin.includes('netlify.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Handle Pre-flight request
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('API Key missing in Netlify settings.');

    const { openaiPayload } = JSON.parse(event.body);
    if (!openaiPayload) throw new Error('No payload provided.');

    // Initialize OpenAI with a generous internal timeout
    const openai = new OpenAI({ apiKey, timeout: 60000 });

    // --- 2. THE 2026 SMART ADAPTER LAYER ---
    // This section "fixes" legacy code from your frontend automatically
    
    // Fix 1: Update Token parameter name for GPT-5
    if (openaiPayload.max_tokens) {
      openaiPayload.max_completion_tokens = openaiPayload.max_tokens;
      delete openaiPayload.max_tokens;
    }

    // Fix 2: Force Temperature to 1 (Required for Reasoning models)
    if (openaiPayload.model.includes('gpt-5') || openaiPayload.model.includes('o3')) {
      openaiPayload.temperature = 1;
    }

    // Fix 3: Convert 'system' role to 'developer' role (GPT-5 Standard)
    if (openaiPayload.messages) {
      openaiPayload.messages = openaiPayload.messages.map(m => 
        m.role === 'system' ? { ...m, role: 'developer' } : m
      );

      // Fix 4: Ensure the word "JSON" is in the prompt to prevent 400 errors
      if (openaiPayload.response_format?.type === 'json_object') {
        const promptContent = JSON.stringify(openaiPayload.messages).toLowerCase();
        if (!promptContent.includes('json')) {
          openaiPayload.messages[0].content += " Respond strictly in JSON format.";
        }
      }
    }

    // Fix 5: Speed Optimization (The "Reasoning Effort" Fallback)
    // If your frontend doesn't specify effort, we use "low" to prevent Netlify 10s timeouts.
    if (!openaiPayload.reasoning_effort) {
      openaiPayload.reasoning_effort = "low"; 
    }

    console.log(`[2026 PROXY] Requesting ${openaiPayload.model} with ${openaiPayload.reasoning_effort} effort`);

    // --- 3. DISPATCH TO OPENAI ---
    const chatCompletion = await openai.chat.completions.create(openaiPayload);

    // Success response
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openaiResponse: chatCompletion.choices[0].message.content,
        usage: chatCompletion.usage
      }),
    };

  } catch (error) {
    console.error('2026 Proxy Error:', error.message);
    
    // Return a detailed error so the frontend knows what happened
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: "Proxy Translation Failed",
        message: error.message 
      }),
    };
  }
};
