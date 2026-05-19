// =================================================================================
// PROBLEM PULSE V3 - MAY 2026 EDITION (PART 1)
// =================================================================================

// --- 1. GLOBAL VARIABLES & CONSTANTS ---
const OPENAI_PROXY_URL = 'https://problem-finder-v3.netlify.app/.netlify/functions/openai-proxy';
const REDDIT_PROXY_URL = 'https://problem-finder-v3.netlify.app/.netlify/functions/reddit-proxy';
const HARD_MIN_SUBSCRIBERS = 1000;
const HARD_MIN_ACTIVE_USERS = 0;
const LENIENT_MIN_SUBSCRIBERS = 500;
const LENIENT_MIN_ACTIVE_USERS = 0;
let originalGroupName = '';
let _allRankedSubreddits = [];

const suggestions = ["Dog Lovers", "Start-up Founders", "Fitness Freaks", "AI Enthusiasts", "Home Bakers", "Gamers", "Content Creators", "Software Developers", "Brides To Be"];
const positiveColors = ['#00a5ce', '#0090b5', '#00c0e6', '#7bd9ec', '#b3e8f3', '#006d85'];
const negativeColors = ['#fd80c7', '#d6539d', '#ff4fa3', '#ff99d6', '#fbb6ce', '#f472b6'];
const lemmaMap = { 'needs': 'need', 'wants': 'want', 'loves': 'love', 'loved': 'love', 'loving': 'love', 'hates': 'hate', 'wishes': 'wish', 'wishing': 'wish', 'solutions': 'solution', 'challenges': 'challenge', 'recommended': 'recommend', 'disappointed': 'disappoint', 'frustrated': 'frustrate', 'annoyed': 'annoy' };
const positiveWords = new Set(['love', 'amazing', 'awesome', 'beautiful', 'best', 'brilliant', 'celebrate', 'charming', 'dope', 'excellent', 'excited', 'exciting', 'epic', 'fantastic', 'flawless', 'gorgeous', 'happy', 'impressed', 'incredible', 'insane', 'joy', 'keen', 'lit', 'perfect', 'phenomenal', 'proud', 'rad', 'super', 'stoked', 'thrilled', 'vibrant', 'wow', 'wonderful', 'blessed', 'calm', 'chill', 'comfortable', 'cozy', 'grateful', 'loyal', 'peaceful', 'pleased', 'relaxed', 'relieved', 'satisfied', 'secure', 'thankful', 'want', 'wish', 'hope', 'desire', 'craving', 'benefit', 'bonus', 'deal', 'hack', 'improvement', 'quality', 'solution', 'strength', 'advice', 'tip', 'trick', 'recommend']);
const negativeWords = new Set(['angry', 'annoy', 'anxious', 'awful', 'bad', 'broken', 'hate', 'challenge', 'confused', 'crazy', 'critical', 'danger', 'desperate', 'disappoint', 'disgusted', 'dreadful', 'fear', 'frustrate', 'furious', 'horrible', 'irritated', 'jealous', 'nightmare', 'outraged', 'pain', 'panic', 'problem', 'rant', 'scared', 'shocked', 'stressful', 'terrible', 'terrified', 'trash', 'alone', 'ashamed', 'bored', 'depressed', 'discouraged', 'dull', 'empty', 'exhausted', 'failure', 'guilty', 'heartbroken', 'hopeless', 'hurt', 'insecure', 'lonely', 'miserable', 'sad', 'sorry', 'tired', 'unhappy', 'upset', 'weak', 'need', 'disadvantage', 'issue', 'flaw']);
const emotionalIntensityScores = { 'annoy': 3, 'irritated': 3, 'bored': 2, 'issue': 3, 'sad': 4, 'bad': 3, 'confused': 4, 'tired': 3, 'upset': 5, 'unhappy': 5, 'disappoint': 6, 'frustrate': 6, 'stressful': 6, 'awful': 7, 'hate': 8, 'angry': 7, 'broken': 5, 'exhausted': 5, 'pain': 7, 'miserable': 8, 'terrible': 8, 'worst': 9, 'horrible': 8, 'furious': 9, 'outraged': 9, 'dreadful': 8, 'terrified': 10, 'nightmare': 10, 'heartbroken': 9, 'desperate': 8, 'rage': 10, 'problem': 4, 'challenge': 5, 'critical': 6, 'danger': 7, 'fear': 7, 'panic': 8, 'scared': 6, 'shocked': 7, 'trash': 5, 'alone': 4, 'ashamed': 5, 'depressed': 8, 'discouraged': 5, 'dull': 2, 'empty': 6, 'failure': 7, 'guilty': 6, 'hopeless': 8, 'insecure': 5, 'lonely': 6, 'weak': 4, 'need': 5, 'disadvantage': 4, 'flaw': 4 };
const stopWords = ["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "like", "just", "dont", "can", "people", "help", "hes", "shes", "thing", "stuff", "really", "actually", "even", "know", "still", "post", "posts", "subreddit", "redditor", "redditors", "comment", "comments"];

// --- 2. CORE UTILITY HELPERS ---
function generateNgrams(words, n) {
    const ngrams = [];
    if (n > words.length) return ngrams;
    for (let i = 0; i <= words.length - n; i++) {
        const ngramSlice = words.slice(i, i + n);
        if (!ngramSlice.some(word => stopWords.includes(word))) {
            ngrams.push(ngramSlice.join(' '));
        }
    }
    return ngrams;
}

function deduplicatePosts(posts) { 
    const seen = new Set(); 
    return posts.filter(post => { 
        if (!post.data || !post.data.id) return false; 
        if (seen.has(post.data.id)) return false; 
        seen.add(post.data.id); 
        return true; 
    }); 
}

function deduplicateByContent(items) {
    const seenContentSignatures = new Set();
    const uniqueIds = new Set();
    return items.filter(item => {
        const id = item.data.id;
        const content = (item.data.selftext || item.data.body || '').trim();
        if (!content || uniqueIds.has(id)) return false;
        const signature = content.substring(0, 500).toLowerCase().replace(/\s+/g, '');
        if (signature.length < 20) {
            if (seenContentSignatures.has(content)) return false;
            seenContentSignatures.add(content);
        } else {
            if (seenContentSignatures.has(signature)) return false;
            seenContentSignatures.add(signature);
        }
        uniqueIds.add(id);
        return true;
    });
}

function formatDate(utcSeconds) { 
    const date = new Date(utcSeconds * 1000); 
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); 
}

function lemmatize(word) { 
    if (lemmaMap[word]) return lemmaMap[word]; 
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1); 
    return word; 
}

function getFirstTwoSentences(text) { 
    if (!text) return ''; 
    const sentences = text.match(/[^\.!\?]+[\.!\?]+(?:\s|$)/g); 
    return sentences ? sentences.slice(0, 2).join(' ').trim() : text; 
}
// =================================================================================
// PART 2: AI CORE INTELLIGENCE (UPGRADED TO GPT-5.4-mini)
// =================================================================================

async function classifySentimentWithAI(posts) {
    const BATCH_SIZE = 50; // Increased for GPT-5.4-mini context windows
    let allSentiments = [];

    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
        const batch = posts.slice(i, i + BATCH_SIZE);
        const postsForAI = batch.map((p, index) => ({
            index: index,
            text: `Title: ${p.data.title || ''}. Body: ${(p.data.selftext || p.data.body || '').substring(0, 400)}`
        }));

        const prompt = `You are a sentiment analysis engine. For each post, classify overall sentiment as "Positive", "Negative", or "Neutral". Respond ONLY with valid JSON object: { "sentiments": [ {"post_index": 0, "sentiment": "Positive"} ] }.

        Posts to analyze:
        ${JSON.stringify(postsForAI)}`;

        const openAIParams = {
            model: "gpt-5.4-mini",
            messages: [{ role: "system", content: "You are a precise JSON-only sentiment classifier." }, { role: "user", content: prompt }],
            temperature: 0,
            max_tokens: 2000,
            response_format: { "type": "json_object" }
        };

        try {
            const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
            if (response.ok) {
                const data = await response.json();
                const parsed = JSON.parse(data.openaiResponse);
                if (parsed.sentiments && Array.isArray(parsed.sentiments)) {
                    const sentimentMap = new Map(parsed.sentiments.map(s => [s.post_index, s.sentiment]));
                    const batchSentiments = postsForAI.map(p => sentimentMap.get(p.index) || 'Neutral');
                    allSentiments.push(...batchSentiments);
                }
            } else {
                 allSentiments.push(...Array(batch.length).fill('Neutral'));
            }
        } catch (error) {
            console.error("AI sentiment classification batch failed:", error);
            allSentiments.push(...Array(batch.length).fill('Neutral'));
        }
    }
    return allSentiments;
}

async function generateSentimentContextWithAI(posts, brandName) {
    const samplePosts = posts.slice(0, 30);
    if (samplePosts.length === 0) {
        return { positive_theme: "", negative_theme: "", verdict: "No discussion found." };
    }

    const postsForAI = samplePosts.map(p => `"${(p.data.title || '')} - ${(p.data.selftext || p.data.body || '').substring(0, 250)}"`).join('\n');

    const prompt = `Analyze user comments about "${brandName}". Respond ONLY with valid JSON: { "positive_theme": "...", "negative_theme": "...", "verdict": "..." }. User Comments: ${postsForAI}`;

    const openAIParams = {
        model: "gpt-5.4-mini",
        messages: [{ role: "system", content: "You are a concise market analyst outputting only JSON." }, { role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { "type": "json_object" }
    };

    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        if (response.ok) {
            const data = await response.json();
            return JSON.parse(data.openaiResponse);
        }
    } catch (error) {
        console.error("AI context generation failed:", error);
    }
    return { positive_theme: "N/A", negative_theme: "N/A", verdict: "Error generating context." };
}

async function assignPostsToFindings(summaries, posts) {
    const postsForAI = posts.slice(0, 75); // Increased limit for 2026
    const prompt = `Categorize Reddit posts into Findings. Respond ONLY with JSON: {"assignments": [{"postNumber": 1, "finding": 2}]}.
    Findings: ${summaries.map((s, i) => `Finding ${i + 1}: ${s.title}`).join('\n')}
    Posts: ${postsForAI.map((p, i) => `Post ${i + 1}: ${(p.data.title || '').substring(0, 150)}`).join('\n')}`;

    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are a data categorization engine." }, { role: "user", content: prompt }], 
        temperature: 0, 
        max_tokens: 2000, 
        response_format: { "type": "json_object" } 
    };

    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        return JSON.parse(data.openaiResponse).assignments || [];
    } catch (error) {
        console.error("Assignment function error:", error);
        return [];
    }
}

async function getRelatedSearchTermsAI(audience) {
    const prompt = `Given the audience "${audience}", generate up to 5 related search terms. Respond ONLY with JSON: {"terms": ["string"]}.`;
    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are a creative brainstorming assistant." }, { role: "user", content: prompt }], 
        temperature: 0.4, 
        max_tokens: 200, 
        response_format: { "type": "json_object" } 
    };
    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        return JSON.parse(data.openaiResponse).terms || [];
    } catch (error) { return []; }
}

async function findSubredditsForGroup(groupName) {
    const relatedTerms = await getRelatedSearchTermsAI(groupName);
    const allTerms = [groupName, ...relatedTerms];
    const prompt = `Suggest up to 20 Reddit subreddits for [${allTerms.join(', ')}]. Respond ONLY with JSON: {"subreddits": ["name"]}.`;
    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are a Reddit community finder." }, { role: "user", content: prompt }], 
        temperature: 0.2, 
        max_tokens: 400, 
        response_format: { "type": "json_object" } 
    };
    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        return JSON.parse(data.openaiResponse).subreddits || [];
    } catch (error) {
        alert("Could not find communities. Try another name.");
        return [];
    }
}

async function generateFAQs(posts) {
    const topPostsText = posts.slice(0, 30).map(p => `Title: ${p.data.title}\nContent: ${(p.data.selftext || '').substring(0, 500)}`).join('\n---\n');
    const prompt = `Extract up to 5 FAQs from these posts. Respond ONLY with JSON: {"faqs": ["Question?"]}. Posts: ${topPostsText}`;
    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are an FAQ expert." }, { role: "user", content: prompt }], 
        temperature: 0.1, 
        max_tokens: 600, 
        response_format: { "type": "json_object" } 
    };
    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        return JSON.parse(data.openaiResponse).faqs || [];
    } catch (error) { return []; }
}
// =================================================================================
// PART 3: MARKET PSYCHOLOGY & ENTITY EXTRACTION (UPGRADED TO GPT-5.4-mini)
// =================================================================================

async function extractAndValidateEntities(posts, nicheContext) {
    const topPostsText = posts.slice(0, 60).map(p => {
        const title = p.data.title || p.data.link_title;
        const body = p.data.selftext || p.data.body || '';
        return `Title: ${title}\nBody: ${body.substring(0, 800)}`;
    }).join('\n---\n');

    const prompt = `You are a market research analyst for '${nicheContext}'. Extract: 
    1. "brands": Specific proper-noun company names. 
    2. "products": Common generic product categories. 
    Respond ONLY with valid JSON: {"brands": [], "products": []}. 
    Text: ${topPostsText}`;

    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are a meticulous JSON-only extraction engine." }, { role: "user", content: prompt }], 
        temperature: 0, 
        max_tokens: 1200, 
        response_format: { "type": "json_object" } 
    };

    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        const parsed = JSON.parse(data.openaiResponse);
        
        window._entityData = { brands: {}, products: {} };
        const allEntities = { brands: parsed.brands || [], products: parsed.products || [] };

        for (const type in allEntities) {
            allEntities[type].forEach(name => {
                const regex = new RegExp(`\\b${name.replace(/ /g, '\\s')}(s?)\\b`, 'gi');
                const mentioningPosts = posts.filter(post => regex.test(`${post.data.title || ''} ${post.data.selftext || ''}`));
                if (mentioningPosts.length > 0) {
                    window._entityData[type][name] = { count: mentioningPosts.length, posts: mentioningPosts };
                }
            });
        }
        return {
            topBrands: Object.entries(window._entityData.brands).sort((a, b) => b[1].count - a[1].count).slice(0, 8),
            topProducts: Object.entries(window._entityData.products).sort((a, b) => b[1].count - a[1].count).slice(0, 8)
        };
    } catch (error) {
        console.error("Entity extraction error:", error);
        return { topBrands: [], topProducts: [] };
    }
}

async function generateAndRenderBrandBrief(itemName, itemType) {
    const isBrand = itemType === 'brands';
    const targetPanel = document.getElementById(isBrand ? 'brand-detail-panel' : 'product-detail-panel');
    const overlay = document.getElementById('brief-overlay');
    if (!targetPanel || !overlay) return;

    targetPanel.innerHTML = '<div class="brief-content"><p class="loading-text">Generating Brief... <span class="loader-dots"></span></p></div>';
    targetPanel.classList.add('visible'); overlay.classList.add('visible');

    const postsForAnalysis = (window._entityData?.[itemType]?.[itemName]?.posts || []).slice(0, 80);
    const topPostsText = postsForAnalysis.map(p => `"${p.data.title || ''} - ${p.data.selftext || ''}"`).join('\n');

    const prompt = `Create a market brief for "${itemName}" based on "${originalGroupName}" user comments.
    Respond ONLY with valid JSON containing:
    "what_it_is": one line explanation,
    "use_case": primary job people hire this for,
    "loves": 3 strengths with quotes,
    "hates": 3 pain points framed as opportunities,
    "verdict": one-line position in market.
    Text: ${topPostsText}`;

    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are a brand strategist providing structured JSON." }, { role: "user", content: prompt }], 
        temperature: 0.2, 
        response_format: { "type": "json_object" } 
    };

    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        const parsed = JSON.parse(data.openaiResponse);
        
        // Layout logic (Preserved from your original)
        targetPanel.innerHTML = `
            <div class="brief-content">
                <button class="context-close-btn" onclick="document.querySelectorAll('.custom-side-panel').forEach(p => p.classList.remove('visible')); document.getElementById('brief-overlay').classList.remove('visible');">×</button>
                <h3 class="brief-header">${isBrand ? 'Competitive Brief' : 'Category Analysis'}: ${itemName}</h3>
                <div class="brief-section"><h4>ℹ️ What It Is</h4><p>${parsed.what_it_is}</p></div>
                <div class="brief-section"><h4>💡 Primary Use Case</h4><p>${parsed.use_case || parsed.job_to_be_done}</p></div>
                <div class="brief-section"><h4>🟢 Key Strengths</h4><ul>${parsed.loves.map(l => `<li>${l}</li>`).join('')}</ul></div>
                <div class="brief-section"><h4>🔴 Opportunities</h4><ul>${parsed.hates.map(h => `<li>${h}</li>`).join('')}</ul></div>
                <div class="brief-verdict"><p><strong>🔮 Verdict:</strong> ${parsed.verdict}</p></div>
            </div>`;
    } catch (e) { targetPanel.innerHTML = '<p class="error">Brief generation failed.</p>'; }
}

async function generateAndRenderMindsetSummary(posts, audienceContext) {
    const archetypeHeadingEl = document.getElementById('archetype-heading');
    const archetypeDescEl = document.getElementById('archetype-d');
    const characteristicsEl = document.getElementById('characteristics-d');
    const rejectsEl = document.getElementById('reject-d');
    if (!archetypeHeadingEl) return;

    const topPostsText = posts.slice(0, 50).map(p => `Title: ${p.data.title}\nContent: ${p.data.selftext || ''}`).join('\n---\n');

    const prompt = `Analyze this audience: "${audienceContext}". 
    Return JSON: {
        "archetype": "2-3 word name",
        "summary": "1-2 sentence core motivation",
        "values": [{"title": "", "description": ""}],
        "rejects": [{"title": "", "description": ""}]
    }
    Posts: ${topPostsText}`;

    const openAIParams = { 
        model: "gpt-5.4-mini", 
        messages: [{ role: "system", content: "You are an expert market psychologist outputting JSON." }, { role: "user", content: prompt }], 
        temperature: 0.3, 
        response_format: { "type": "json_object" } 
    };

    try {
        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: openAIParams }) });
        const data = await response.json();
        const { archetype, summary, values, rejects } = JSON.parse(data.openaiResponse);

        archetypeHeadingEl.textContent = archetype;
        archetypeDescEl.textContent = summary;
        characteristicsEl.innerHTML = '<ul>' + values.map(v => `<li><strong>${v.title}:</strong> ${v.description}</li>`).join('') + '</ul>';
        rejectsEl.innerHTML = '<ul>' + rejects.map(r => `<li><strong>${r.title}:</strong> ${r.description}</li>`).join('') + '</ul>';
    } catch (e) { archetypeHeadingEl.textContent = 'Analysis Complete'; }
}

async function generateAndRenderStrategicPillars(posts, audienceContext) {
    const goalsContainer = document.getElementById('goals-pillar');
    const fearsContainer = document.getElementById('fears-pillar');
    if (!goalsContainer) return;

    const topPostsText = posts.slice(0, 50).map(p => `Content: ${p.data.title} ${p.data.selftext || ''}`).join('\n---\n');
    const prompt = `Identify 3 Ultimate Goals and 3 Greatest Fears for "${audienceContext}". Return JSON: {"goals": [], "fears": []}. Text: ${topPostsText}`;

    const openAIParams = { model: "gpt-5.4-mini", messages: [{role: "system", content: "JSON output only."}, {role: "user", content: prompt}], temperature: 0.3, response_format: {"type": "json_object"}};

    try {
        const res = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: openAIParams }) });
        const { goals, fears } = JSON.parse((await res.json()).openaiResponse);
        
        const renderList = (items) => items.map(item => `<div class="pillar-item"><p class="pillar-item-text">${item}</p></div>`).join('<div class="pillar-separator"></div>');
        goalsContainer.innerHTML = renderList(goals);
        fearsContainer.innerHTML = renderList(fears);
    } catch (e) { console.error("Pillars failed"); }
}

async function generateAndRenderAIPrompt(posts, audienceContext) {
    const container = document.getElementById('ai-prompt-container');
    if (!container) return;

    const topPostsText = posts.slice(0, 30).map(p => `${p.data.title}`).join('\n');
    const prompt = `Create a Generative AI Prompt for the voice of "${audienceContext}". Return JSON with keys: tone, vocabulary, style, sentiment. Text: ${topPostsText}`;

    const openAIParams = { model: "gpt-5.4-mini", messages: [{role: "system", content: "Brand strategist JSON output."}, {role: "user", content: prompt}], temperature: 0.2, response_format: {"type": "json_object"}};

    try {
        const res = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: openAIParams }) });
        const p = JSON.parse((await res.json()).openaiResponse);
        const promptText = `TONE: ${p.tone.join(', ')}\nVOCAB: ${p.vocabulary.join(', ')}\nSENTIMENT: ${p.sentiment}`;
        container.innerHTML = `<h3 class="dashboard-section-title">Generative AI Prompt</h3><div class="ai-prompt-content">${promptText}</div>`;
    } catch (e) { console.error("Prompt failed"); }
}
// =================================================================================
// PART 4: VISUAL SEO & STRATEGIC VALUE MAPPING (UPGRADED TO GPT-5.4-mini)
// =================================================================================

async function generateAndRenderSeoSunburst(posts, audienceContext) {
    const container = document.getElementById('keyword-sunburst');
    if (!container) return;
    container.innerHTML = '<p class="loading-text">Mapping search landscape via GPT-5.4 mini...</p>';

    try {
        const topPostsText = posts.slice(0, 60).map(p => `Title: ${p.data.title}\nContent: ${p.data.selftext || ''}`).join('\n---\n');

        const prompt = `You are an expert SEO strategist for "${audienceContext}". Create a 3-level SEO plan.
        For each intent (problem_aware, solution_seeking, purchase_intent), provide 2-5 primary keywords.
        - Each primary: 2-4 secondary keywords.
        - Each secondary: 2-3 long_tail keywords.
        - Each long-tail: 1-2 content_examples.
        Respond ONLY with valid JSON: { "problem_aware": [...], "solution_seeking": [...], "purchase_intent": [...] }.
        Text: ${topPostsText}`;

        const openAIParams = {
            model: "gpt-5.4-mini",
            messages: [{ role: "system", content: "You are a JSON-only SEO strategist." }, { role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { "type": "json_object" }
        };

        const response = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: openAIParams }) });
        const aiResult = await response.json();
        const seoPlan = JSON.parse(aiResult.openaiResponse);
        
        // Render the action cards below the chart
        generateAndRenderActionCards(seoPlan, audienceContext);

        // --- Highcharts Sunburst Transformation Logic ---
        const sunburstData = [
            { id: 'root', parent: '', name: 'SEO Plan', levelName: 'SEO Plan' },
            { id: 'pa', parent: 'root', name: 'Problem-Aware', color: '#6AA9FF', levelName: 'Intent bucket' },
            { id: 'ss', parent: 'root', name: 'Solution-Seeking', color: '#9B7CFF', levelName: 'Intent bucket' },
            { id: 'pi', parent: 'root', name: 'Purchase-Intent', color: '#5ED1B8', levelName: 'Intent bucket' }
        ];

        const processIntent = (intentId, intentName, intentData) => {
            if (!intentData || !Array.isArray(intentData)) return;
            intentData.forEach((primary, i) => {
                const primaryId = `${intentId}_p_${i}`;
                sunburstData.push({ id: primaryId, parent: intentId, name: primary.keyword, intentName, levelName: 'Primary keyword', searchVolume: primary.searchVolume });
                (primary.secondary_keywords || []).forEach((secondary, j) => {
                    const secondaryId = `${primaryId}_s_${j}`;
                    sunburstData.push({ id: secondaryId, parent: primaryId, name: secondary.keyword, intentName, levelName: 'Secondary keyword', searchVolume: secondary.searchVolume });
                    (secondary.long_tail_keywords || []).forEach((longtail, k) => {
                        const longtailId = `${secondaryId}_l_${k}`;
                        sunburstData.push({ id: longtailId, parent: secondaryId, name: longtail.keyword, intentName, levelName: 'Long-tail keyword', searchVolume: longtail.searchVolume });
                        (longtail.content_examples || []).forEach((content, l) => {
                            sunburstData.push({ id: `${longtailId}_c_${l}`, parent: longtailId, name: content.title, value: (longtail.searchVolume / 2), intentName, levelName: 'Content example', searchVolume: longtail.searchVolume });
                        });
                    });
                });
            });
        };

        processIntent('pa', 'Problem-Aware', seoPlan.problem_aware);
        processIntent('ss', 'Solution-Seeking', seoPlan.solution_seeking);
        processIntent('pi', 'Purchase-Intent', seoPlan.purchase_intent);

        Highcharts.chart(container, {
            chart: { type: 'sunburst', height: '650px', backgroundColor: null },
            title: { text: null },
            credits: { enabled: false },
            series: [{
                type: 'sunburst',
                data: sunburstData,
                allowDrillToNode: true,
                cursor: 'pointer',
                levels: [{ level: 1, levelIsConstant: false }, { level: 2, colorByPoint: true }, { level: 3, colorVariation: { key: 'brightness', to: -0.25 } }]
            }],
            tooltip: {
                useHTML: true,
                formatter: function() {
                    return `<b>${this.point.name}</b><br/>Level: ${this.point.levelName}<br/>Volume: ${this.point.searchVolume || 'N/A'}`;
                }
            }
        });
    } catch (e) { container.innerHTML = '<p class="error">SEO Sunburst failed.</p>'; }
}

function generateAndRenderActionCards(seoPlan, audienceContext) {
    const container = document.getElementById('keyword-opportunities-container');
    if (!container) return;

    const allContentIdeas = [];
    ['problem_aware', 'solution_seeking', 'purchase_intent'].forEach(intent => {
        if (!seoPlan[intent]) return;
        seoPlan[intent].forEach(p => {
            (p.secondary_keywords || []).forEach(s => {
                (s.long_tail_keywords || []).forEach(l => {
                    (l.content_examples || []).forEach(c => {
                        allContentIdeas.push({ title: c.title, intent, primaryKeyword: p.keyword, secondaryKeyword: s.keyword, longTailKeyword: l.keyword, primaryVolume: p.searchVolume });
                    });
                });
            });
        });
    });

    const trafficDrivers = allContentIdeas.filter(i => i.intent === 'problem_aware').slice(0, 4);
    const conversionBoosters = allContentIdeas.filter(i => i.intent === 'purchase_intent').slice(0, 4);

    container.innerHTML = `
        <div class="action-cards-grid">
            ${renderActionCardHTML('Traffic Drivers', 'Top-of-funnel content', trafficDrivers)}
            ${renderActionCardHTML('Conversion Boosters', 'Ready-to-buy content', conversionBoosters)}
        </div>`;
}

function renderActionCardHTML(title, subtitle, ideas) {
    if (!ideas.length) return '';
    const items = ideas.map(idea => `
        <details class="action-item-dropdown">
            <summary class="action-item-summary">📝 ${idea.title}</summary>
            <div class="action-item-context">
                <p><strong>Target:</strong> ${idea.primaryKeyword}</p>
                <p><strong>Intent:</strong> ${idea.intent}</p>
            </div>
        </details>`).join('');
    return `<div class="action-card"><h3>${title}</h3><p>${subtitle}</p>${items}</div>`;
}

async function generateProblemOfferPairsAI(summaries) {
    if (!summaries || summaries.length === 0) return [];
    const problemTitles = summaries.map(s => s.title);
    const prompt = `For each problem of the "${originalGroupName}" audience, generate a single, concise "offer angle". 
    Respond ONLY with JSON: { "pairs": [ { "problem": "...", "offer": "..." } ] }.
    Problems: ${JSON.stringify(problemTitles)}`;

    const params = { model: "gpt-5.4-mini", messages: [{role: "system", content: "Startup advisor JSON output."}, {role: "user", content: prompt}], temperature: 0.6, response_format: {"type": "json_object"}};
    try {
        const res = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: params }) });
        const data = await res.json();
        return JSON.parse(data.openaiResponse).pairs || [];
    } catch (e) { return []; }
}

async function generateAndRenderValueSankey(audienceName, summaries) {
    const container = document.getElementById('value-tree');
    if (!container) return;
    container.innerHTML = '<p class="loading-text">Generating AI value propositions... <span class="loader-dots"></span></p>';

    const pairs = await generateProblemOfferPairsAI(summaries);
    const sankeyData = pairs.map(p => [p.problem, p.offer, 1]);
    const sankeyNodes = [];
    const seen = new Set();
    pairs.forEach(p => {
        if(!seen.has(p.problem)) { sankeyNodes.push({ id: p.problem, name: p.problem, column: 0, type: 'problem' }); seen.add(p.problem); }
        if(!seen.has(p.offer)) { sankeyNodes.push({ id: p.offer, name: p.offer, column: 1, type: 'offer' }); seen.add(p.offer); }
    });

    Highcharts.chart('value-tree', {
        chart: { type: 'sankey', backgroundColor: 'transparent' },
        title: { text: null },
        credits: { enabled: false },
        series: [{
            keys: ['from', 'to', 'weight'],
            data: sankeyData,
            nodes: sankeyNodes,
            dataLabels: {
                enabled: true, useHTML: true,
                formatter: function() {
                    const className = this.point.type === 'problem' ? 'sankey-problem' : 'sankey-offer';
                    return `<div class="sankey-label ${className}">${this.point.name}</div>`;
                }
            }
        }]
    });
}
// =================================================================================
// PART 5: CORE RUNNER, INTERACTIVITY & VISUALIZATION (FINAL SECTION)
// =================================================================================

async function runProblemFinder(options = {}) {
    console.log("Starting analysis for audience:", originalGroupName);
    const { isUpdate = false } = options;
    const searchButton = document.getElementById('search-selected-btn');
    const selectedCheckboxes = document.querySelectorAll('#subreddit-choices input:checked');
    if (selectedCheckboxes.length === 0) { alert("Please select at least one community."); return; }
    const selectedSubreddits = Array.from(selectedCheckboxes).map(cb => cb.value);
    const subredditQueryString = selectedSubreddits.map(sub => `subreddit:${sub}`).join(' OR ');

    if (!isUpdate) {
        searchButton.classList.add('is-loading');
        searchButton.disabled = true;
    }

    const problemTerms = ["problem", "challenge", "frustration", "struggle", "advice", "how to", "fix", "rant"];
    const demandSignalTerms = ["i'd pay for", "buy it", "subscribe to", "waste time on", "no tool for", "wish someone would build"];
    const resultsWrapper = document.getElementById('results-wrapper-b');
    const countHeaderDiv = document.getElementById("count-header");

    try {
        // Step 1: Fetch and Deduplicate Data
        const problemItems = await fetchMultipleRedditDataBatched(subredditQueryString, problemTerms, 50, "all");
        const filteredItems = filterPosts(problemItems, 20);
        if (filteredItems.length < 5) throw new Error("Not enough data found.");
        window._filteredPosts = filteredItems;

        // Step 2: Render UI Components (Parallel)
        renderPosts(filteredItems);
        generateAndRenderHybridSentiment(filteredItems, originalGroupName);
        generateEmotionMapData(filteredItems).then(renderEmotionMap);
        renderIncludedSubreddits(selectedSubreddits);
        generateAndRenderMindsetSummary(filteredItems, originalGroupName);
        generateAndRenderStrategicPillars(filteredItems, originalGroupName);
        generateAndRenderAIPrompt(filteredItems, originalGroupName);
        generateAndRenderSeoSunburst(filteredItems, originalGroupName);
        
        // Step 3: Detailed Problem Synthesis (Call the Analyze Function)
        const analysisRes = await fetch('https://iridescent-fairy-a41db7.netlify.app/.netlify/functions/analyze-problems', {
            method: 'POST',
            body: JSON.stringify({ subredditQueryString, timeFilter: "all", minUpvotes: 20, originalGroupName, searchTerms: problemTerms })
        });
        const analysisData = await analysisRes.json();
        window._summaries = analysisData.summaries;
        
        // Update Dashboard Stats
        if (countHeaderDiv) { 
            countHeaderDiv.innerHTML = `Distilled <span class="header-pill pill-insights">${filteredItems.length}</span> insights for <span class="header-pill pill-audience">${originalGroupName}</span>`; 
        }

        // Render final specialized charts
        generateAndRenderValueSankey(originalGroupName, window._summaries);
        setTimeout(() => runConstellationAnalysis(subredditQueryString, demandSignalTerms, "all"), 1000);

        // Show Results
        if (resultsWrapper) {
            resultsWrapper.style.display = 'flex';
            setTimeout(() => { resultsWrapper.style.opacity = '1'; }, 50);
            resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

    } catch (err) {
        console.error("Analysis Error:", err);
        alert("An error occurred: " + err.message);
    } finally {
        if (!isUpdate) { searchButton.classList.remove('is-loading'); searchButton.disabled = false; }
    }
}

function renderEmotionMap(data) {
    const container = document.getElementById('emotion-map-container');
    if (!container || !data.length) return;
    
    // Clear and build canvas (Preserving your original layout)
    container.innerHTML = `<h3 class="dashboard-section-title">Problem Polarity Map</h3><div id="emotion-map-wrapper"><canvas id="emotion-chart-canvas"></canvas></div>`;
    const ctx = document.getElementById('emotion-chart-canvas').getContext('2d');

    window.myEmotionChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.9)',
                pointRadius: 10
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { title: (items) => items[0].raw.label } } },
            scales: {
                x: { title: { display: true, text: 'Frequency', color: 'white' }, min: 0, max: 10 },
                y: { title: { display: true, text: 'Intensity', color: 'white' }, min: 0, max: 10 }
            }
        }
    });
}

async function runConstellationAnalysis(subredditQueryString, demandTerms, timeFilter) {
    const posts = await fetchMultipleRedditDataBatched(subredditQueryString, demandTerms, 30, timeFilter);
    const prioritized = posts.slice(0, 40);
    
    const extractionPrompt = `Extract 5 purchase intent quotes from these comments. Return JSON: {"signals": [{"quote": "", "problem_theme": "", "category": "DemandSignals"}]}. Text: ${prioritized.map(p => p.data.body).join('\n')}`;
    const params = { model: "gpt-5.4-mini", messages: [{role: "user", content: extractionPrompt}], response_format: {"type": "json_object"}};
    
    try {
        const res = await fetch(OPENAI_PROXY_URL, { method: 'POST', body: JSON.stringify({ openaiPayload: params }) });
        const { signals } = JSON.parse((await res.json()).openaiResponse);
        // Inject source data for tooltips
        const enriched = signals.map((s, i) => ({ ...s, source: prioritized[i]?.data || {subreddit: 'niche', ups: 0} }));
        renderHighchartsBubbleChart(enriched);
    } catch (e) { console.error("Bubble chart failed"); }
}

function renderHighchartsBubbleChart(signals) {
    const container = document.getElementById('constellation-map-container');
    if (!signals.length) return;

    Highcharts.chart(container, {
        chart: { type: 'packedbubble', backgroundColor: 'transparent' },
        title: { text: null },
        plotOptions: { packedbubble: { minSize: '30%', maxSize: '100%', layoutAlgorithm: { splitSeries: true } } },
        series: [{ name: 'Signals', data: signals.map(s => ({ name: s.problem_theme, value: 1, quote: s.quote, source: s.source })) }],
        tooltip: { useHTML: true, formatter: function() { return `<b>${this.point.name}</b><br/>"${this.point.quote}"`; } }
    });
}

function initializeDashboardInteractivity() {
    document.addEventListener('click', (e) => {
        const briefBtn = e.target.closest('.brief-button');
        if (briefBtn) {
            const parent = briefBtn.closest('.discovery-list-item');
            generateAndRenderBrandBrief(parent.dataset.word, parent.dataset.type);
        }
        if (e.target.closest('#back-to-step1-btn')) location.reload();
    });
}

function initializeProblemFinderTool() {
    const findBtn = document.getElementById('find-communities-btn');
    const groupInput = document.getElementById('group-input');
    
    if (findBtn) {
        findBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            originalGroupName = groupInput.value.trim();
            if (!originalGroupName) return;
            
            document.getElementById('step-1-container').classList.add('hidden');
            document.getElementById('subreddit-selection-container').classList.add('visible');
            
            const subs = await findSubredditsForGroup(originalGroupName);
            const ranked = await fetchAndRankSubreddits(subs);
            document.getElementById('subreddit-choices').innerHTML = ranked.map(s => `
                <div class="subreddit-choice">
                    <input type="checkbox" id="sub-${s.name}" value="${s.name}" checked>
                    <label for="sub-${s.name}">r/${s.name} (${formatMemberCount(s.members)})</label>
                </div>`).join('');
        });
    }

    const searchBtn = document.getElementById('search-selected-btn');
    if (searchBtn) searchBtn.addEventListener("click", () => runProblemFinder());
    
    initializeDashboardInteractivity();
}

document.addEventListener('DOMContentLoaded', initializeProblemFinderTool);
// =================================================================================
// END OF SCRIPT - MAY 2026 EDITION
// =================================================================================
