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
    const openai = new OpenAI({ apiKey, timeout: 55000 }); // High timeout

    // --- MAY 2026 STABILITY OVERRIDES ---
    openaiPayload.model = "gpt-5-mini";
    openaiPayload.reasoning_effort = "low"; // FORCE SPEED TO PREVENT TIMEOUT
    delete openaiPayload.temperature; // Prevent 400 error
    
    if (openaiPayload.max_tokens) {
      openaiPayload.max_completion_tokens = openaiPayload.max_tokens;
      delete openaiPayload.max_tokens;
    }

    const chatCompletion = await openai.chat.completions.create(openaiPayload);
    const content = chatCompletion.choices[0].message.content;

    // IF CONTENT IS EMPTY, SEND A VALID JSON ERROR INSTEAD
    if (!content) throw new Error("AI returned an empty message.");

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiResponse: content }),
    };

  } catch (error) {
    console.error('Proxy Failure:', error.message);
    return {
      statusCode: 200, // Send 200 but with error data so frontend doesn't crash
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: true, 
        message: error.message,
        openaiResponse: '{"terms": [], "subreddits": []}' // Send empty valid JSON as fallback
      }),
    };
  }
};
