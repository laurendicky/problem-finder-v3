const OpenAI = require('openai');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*' 
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const { openaiPayload } = JSON.parse(event.body);
    const openai = new OpenAI({ apiKey, timeout: 60000 });

    // --- MAY 2026 TIER 3 OPTIMIZATIONS ---
    
    // 1. Force exact model name from your dashboard
    openaiPayload.model = "gpt-5-mini";

    // 2. Remove old-school parameters that conflict with Reasoning
    delete openaiPayload.temperature;
    delete openaiPayload.max_tokens; // We use the proxy to map this below

    // 3. Ensure Reasoning Effort is valid
    openaiPayload.reasoning_effort = "low"; 

    // 4. Map 'system' to 'developer' (GPT-5 strict requirement)
    if (openaiPayload.messages) {
      openaiPayload.messages = openaiPayload.messages.map(m => 
        m.role === 'system' ? { ...m, role: 'developer' } : m
      );
    }

    const chatCompletion = await openai.chat.completions.create(openaiPayload);
    const message = chatCompletion.choices[0].message;

    // --- NEW: REFUSAL TRACKING ---
    if (message.refusal) {
      console.error('AI REFUSAL:', message.refusal);
      throw new Error(`AI Refused: ${message.refusal}`);
    }

    const content = message.content;
    if (!content) throw new Error("AI returned empty content. Reasoning might have failed.");

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiResponse: content }),
    };

  } catch (error) {
    console.error('2026 Proxy Error:', error.message);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: true, 
        message: error.message 
      }),
    };
  }
};
