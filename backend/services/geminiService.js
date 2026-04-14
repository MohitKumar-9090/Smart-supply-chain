/**
 * Google Gemini AI Service
 * Handles all AI-related tasks: delay prediction, route optimization, chat
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini only when needed
let genAI;
let model;
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 12000);

const withTimeout = async (promise, timeoutMs, label = 'operation') => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const getModel = () => {
  if (!model) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return null; // Will use mock responses
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
};

/**
 * Generate AI delay prediction for a shipment
 */
const predictDelay = async (shipmentData) => {
  const m = getModel();
  
  const prompt = `You are an expert supply chain risk analyst. Analyze this shipment and predict delay risk.

Shipment Details:
- Tracking: ${shipmentData.trackingNumber}
- Route: ${shipmentData.origin} → ${shipmentData.destination}
- Cargo: ${shipmentData.cargo} (${shipmentData.weight})
- Carrier: ${shipmentData.carrier}
- Weather Conditions: ${shipmentData.weather}
- Traffic Status: ${shipmentData.traffic}
- Expected Delivery: ${shipmentData.estimatedDelivery}
- Description: ${shipmentData.description}

Provide a JSON response ONLY (no markdown, no explanation outside JSON):
{
  "delayProbability": <number 0-100>,
  "estimatedDelayHours": <number>,
  "riskLevel": "<low|medium|high|critical>",
  "primaryReason": "<main cause>",
  "contributingFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "recommendedAction": "<specific action to take>",
  "alternativeRoutes": ["<route1>", "<route2>"],
  "confidence": <number 0-100>,
  "analysis": "<2-3 sentence professional analysis>"
}`;

  if (!m) {
    // Mock response when Gemini not configured
    return getMockPrediction(shipmentData);
  }

  try {
    const result = await withTimeout(
      m.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini predictDelay'
    );
    const text = result.response.text().trim();
    // Parse JSON from response (strip markdown code blocks if present)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Gemini prediction error:', err.message);
    return getMockPrediction(shipmentData);
  }
};

/**
 * Generate optimized route suggestions
 */
const optimizeRoute = async (routeData) => {
  const m = getModel();

  const prompt = `You are a global logistics route optimization expert. Suggest the best routes for this shipment.

Current Situation:
- Origin: ${routeData.origin}
- Destination: ${routeData.destination}
- Cargo Type: ${routeData.cargo}
- Current Issues: ${routeData.issues || 'None specified'}
- Priority: ${routeData.priority || 'balanced'} (time vs cost)

Provide a JSON response ONLY (no markdown):
{
  "recommendedRoute": {
    "name": "<route name>",
    "path": ["<waypoint1>", "<waypoint2>", "<waypoint3>"],
    "estimatedTime": "<duration>",
    "estimatedCost": "<relative cost>",
    "riskScore": <number 0-100>,
    "pros": ["<pro1>", "<pro2>"],
    "cons": ["<con1>"]
  },
  "alternativeRoutes": [
    {
      "name": "<route name>",
      "path": ["<waypoint1>", "<waypoint2>"],
      "estimatedTime": "<duration>",
      "estimatedCost": "<relative cost>",
      "riskScore": <number 0-100>,
      "summary": "<brief summary>"
    }
  ],
  "reasoning": "<AI explanation of why this route is best>",
  "savings": "<time/cost savings vs current>"
}`;

  if (!m) {
    return getMockRouteOptimization(routeData);
  }

  try {
    const result = await withTimeout(
      m.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini optimizeRoute'
    );
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Gemini route optimization error:', err.message);
    return getMockRouteOptimization(routeData);
  }
};

/**
 * AI Chat Assistant — answer supply chain questions
 */
const chat = async (message, conversationHistory = []) => {
  const m = getModel();

  const systemContext = `You are SmartChain AI, an expert supply chain assistant. 
Roleplay as a senior logistics intelligence system designed to help managers track shipments, predict delays, optimize global port routes, and manage supply chain risk.
Always be highly professional, precise, data-driven, and slightly analytical but helpful. Use Markdown (bolding, lists, and tables) extensively for clarity.
Assume you have access to a database of global demo shipments across key routes such as Shanghai-LA, Hamburg-NY, Mumbai-Dubai, etc.`;

  const historyText = conversationHistory
    .slice(-6) // Last 3 exchanges
    .map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`)
    .join('\n');

  const prompt = `${systemContext}

${historyText ? `Conversation history:\n${historyText}\n` : ''}
User: ${message}

Provide a helpful, concise response as SmartChain AI:`;

  if (!m) {
    return getMockChatResponse(message);
  }

  try {
    const result = await withTimeout(
      m.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini chat'
    );
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini chat error:', err.message);
    return getMockChatResponse(message);
  }
};

// ─────────────────────────────────────────────
// MOCK RESPONSES (used when no Gemini API key)
// ─────────────────────────────────────────────

const getMockPrediction = (data) => {
  const risk = data.riskLevel || data.weather?.includes('Storm') ? 72 : 25;
  return {
    delayProbability: risk,
    estimatedDelayHours: risk > 60 ? 48 : 8,
    riskLevel: risk > 75 ? 'critical' : risk > 50 ? 'high' : risk > 25 ? 'medium' : 'low',
    primaryReason: data.weather?.includes('Storm') || data.weather?.includes('Cyclone')
      ? 'Severe weather disruption on primary route'
      : 'Minor traffic congestion detected',
    contributingFactors: [
      'Current weather: ' + (data.weather || 'Clear'),
      'Traffic status: ' + (data.traffic || 'Normal'),
      'Carrier reliability: 94% historical on-time rate',
    ],
    recommendedAction: risk > 60
      ? 'Reroute immediately via southern corridor to avoid weather system'
      : 'Continue current route. Monitor weather updates every 6 hours',
    alternativeRoutes: [
      'Southern sea route via Cape of Good Hope',
      'Air freight upgrade for time-sensitive cargo',
    ],
    confidence: 87,
    analysis: `Based on current weather patterns and traffic data, this shipment shows a ${risk}% delay probability. Primary driver is ${data.weather?.toLowerCase() || 'weather conditions'} affecting the main corridor. Proactive rerouting is recommended if conditions worsen.`,
  };
};

const getMockRouteOptimization = (data) => ({
  recommendedRoute: {
    name: 'Optimized Northern Route',
    path: [data.origin, 'Mid-Ocean Waypoint', data.destination],
    estimatedTime: '8 days',
    estimatedCost: 'Standard (+5%)',
    riskScore: 22,
    pros: ['Avoids current weather system', '12% faster than southern route', 'Reliable carrier coverage'],
    cons: ['Slightly higher fuel cost'],
  },
  alternativeRoutes: [
    {
      name: 'Express Air Freight',
      path: [data.origin + ' Airport', data.destination + ' Airport'],
      estimatedTime: '2 days',
      estimatedCost: 'Premium (3x)',
      riskScore: 8,
      summary: 'Best for time-critical cargo. Highest cost but guaranteed speed.',
    },
    {
      name: 'Southern Sea Route',
      path: [data.origin, 'Cape of Good Hope', data.destination],
      estimatedTime: '14 days',
      estimatedCost: 'Economy (-15%)',
      riskScore: 35,
      summary: 'Cost-effective but longer. Good for non-urgent bulk cargo.',
    },
  ],
  reasoning: 'The optimized northern route balances speed and cost while avoiding the current storm system affecting the primary route. Historical data shows 94% on-time delivery for this corridor.',
  savings: 'Estimated 1.5 days saved vs. current delayed route at minimal cost premium.',
});

const getMockChatResponse = (message) => {
  const msg = message.toLowerCase();
  if (msg.includes('delay') || msg.includes('late')) {
    return "Based on current data, **TC-2024-003** (Mumbai-Dubai) and **TC-2024-007** (Shenzhen-London) are experiencing significant delays due to weather and port congestion respectively. I recommend reviewing the AI prediction panel for detailed analysis and rerouting options.";
  }
  if (msg.includes('route') || msg.includes('path')) {
    return "I can optimize routes for any active shipment. Currently, the **Hamburg-NY route (SHP-002)** has a high risk score of 72 due to North Atlantic storms. I recommend the southern corridor via Azores, which adds only 18 hours but avoids the storm entirely. Would you like me to generate a full route optimization report?";
  }
  if (msg.includes('risk') || msg.includes('danger')) {
    return "Current risk assessment: 🔴 **2 Critical** shipments (SHP-003, SHP-007), 🟡 **2 High-Risk** (SHP-002, SHP-005), 🟢 **4 On-Track** (SHP-001, SHP-004, SHP-006, SHP-008). Total cargo at risk: ~$4.2M. Recommend immediate action on the Mumbai-Dubai corridor.";
  }
  if (msg.includes('weather')) {
    return "Current weather impacting our shipments: 🌪️ **Cyclone** in Arabian Sea (affecting SHP-003), ⛈️ **North Atlantic Storm** (affecting SHP-002), 🌫️ **Dense fog** at Gibraltar (affecting SHP-005). All other routes show clear conditions.";
  }
  if (msg.includes('best') || msg.includes('efficient')) {
    return "Top performing routes today: 1️⃣ **Singapore-Sydney** (92% efficiency, Clear weather) 2️⃣ **Tokyo-Vancouver** (88% efficiency, all systems green) 3️⃣ **São Paulo-Miami** (83% efficiency, optimal conditions). These corridors have the highest on-time delivery rates this month.";
  }
  return "I'm SmartChain AI, your intelligent supply chain assistant. I can help you with shipment status, delay predictions, route optimization, and risk assessment. Try asking: 'Which shipments are at risk?' or 'Optimize the route for SHP-002' or 'What's the weather situation?'";
};

module.exports = { predictDelay, optimizeRoute, chat };
