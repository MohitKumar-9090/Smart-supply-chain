/**
 * Google Gemini AI Service
 * Handles AI tasks: delay prediction, route optimization, and chat.
 * Falls back to deterministic, input-driven logic when Gemini is unavailable.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

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
      return null;
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toText = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value === 0) return '0';
  return fallback;
};

const toLowerText = (value) => toText(value, '').toLowerCase();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const containsAny = (value, candidates) => {
  const source = toLowerText(value);
  return candidates.some((term) => source.includes(term));
};

const hashString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const parseJsonResponse = (text = '') => {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('No JSON object found in Gemini response');
  }
  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
};

const riskLabelFromScore = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
};

const weatherRiskScore = (weather) => {
  const source = toLowerText(weather);
  if (!source) return 0;
  if (containsAny(source, ['clear', 'sunny', 'stable'])) return 1;
  if (containsAny(source, ['cyclone', 'hurricane', 'typhoon'])) return 36;
  if (containsAny(source, ['storm', 'thunder'])) return 28;
  if (containsAny(source, ['heavy rain', 'rain'])) return 18;
  if (containsAny(source, ['snow', 'blizzard', 'fog'])) return 15;
  if (containsAny(source, ['wind'])) return 10;
  return 4;
};

const trafficRiskScore = (traffic) => {
  const source = toLowerText(traffic);
  if (!source) return 0;
  if (containsAny(source, ['severe', 'extreme', 'gridlock', 'blocked'])) return 24;
  if (containsAny(source, ['high', 'heavy', 'congestion'])) return 16;
  if (containsAny(source, ['moderate'])) return 9;
  if (containsAny(source, ['low', 'normal'])) return 3;
  return 6;
};

const cargoRiskScore = (cargoType) => {
  const source = toLowerText(cargoType);
  if (!source) return 0;
  if (containsAny(source, ['perishable', 'fresh', 'pharma', 'vaccine'])) return 14;
  if (containsAny(source, ['electronics', 'fragile', 'semiconductor'])) return 8;
  if (containsAny(source, ['hazard', 'chemical', 'battery'])) return 11;
  if (containsAny(source, ['bulk', 'ore', 'coal'])) return 5;
  return 4;
};

const priorityRiskBias = (priority) => {
  const key = toLowerText(priority || 'balanced');
  if (key === 'time') return -4;
  if (key === 'cost') return 7;
  return 0;
};

const formatDays = (days) => {
  const rounded = Math.round(days * 10) / 10;
  if (rounded % 1 === 0) return `${rounded.toFixed(0)} days`;
  return `${rounded.toFixed(1)} days`;
};

const formatCostLabel = (index) => {
  if (index <= -2) return 'Economy (-18%)';
  if (index === -1) return 'Economy (-10%)';
  if (index === 0) return 'Standard';
  if (index === 1) return 'Standard (+8%)';
  return 'Premium (+20%)';
};

const getWaypoint = (origin, destination, strategy) => {
  const seed = hashString(`${origin}|${destination}|${strategy}`) % 5;
  const weatherSafe = ['Azores Corridor', 'Cape Relay Point', 'Arabian Sea Bypass', 'Pacific South Loop', 'Atlantic Safety Lane'];
  const trafficSafe = ['Inland Rail Hub', 'Intermodal Transfer Hub', 'Port Decongestion Lane', 'Priority Customs Hub', 'Regional Consolidation Hub'];
  const fast = ['Express Air Hub', 'Direct Rail Link', 'Fast Port Channel', 'Priority Transshipment Hub', 'High-speed Freight Link'];
  const cheap = ['Bulk Cargo Hub', 'Economy Maritime Lane', 'Consolidation Port', 'Deferred Rail Corridor', 'Low-cost Sea Lane'];
  const balanced = ['Primary Trade Corridor', 'Reliability Hub', 'Stable Transit Node', 'Optimized Ocean Lane', 'Mainline Distribution Hub'];

  if (strategy === 'weather-safe') return weatherSafe[seed];
  if (strategy === 'traffic-safe') return trafficSafe[seed];
  if (strategy === 'fastest') return fast[seed];
  if (strategy === 'lowest-cost') return cheap[seed];
  return balanced[seed];
};

const buildDynamicPrediction = (data) => {
  const origin = toText(data.origin, 'Unknown Origin');
  const destination = toText(data.destination, 'Unknown Destination');
  const weather = toText(data.weather, 'clear');
  const traffic = toText(data.traffic, 'normal');
  const cargo = toText(data.cargo || data.cargoType, 'general cargo');
  const carrier = toText(data.carrier, 'standard carrier');
  const explicitRisk = toNumber(data.riskLevel, 0);
  const routeFactor = (hashString(`${origin}|${destination}`) % 16) - 4; // -4..11

  const weatherScore = weatherRiskScore(weather);
  const trafficScore = trafficRiskScore(traffic);
  const cargoScore = cargoRiskScore(cargo);
  const baseline = explicitRisk > 0 ? explicitRisk * 0.45 + 12 : 20;

  const delayProbability = clamp(
    Math.round(baseline + weatherScore + trafficScore + cargoScore + routeFactor),
    5,
    98
  );

  const estimatedDelayHours = clamp(
    Math.round((delayProbability / 100) * 78 + weatherScore * 0.8 + trafficScore * 0.5),
    1,
    120
  );

  const factors = [
    { key: 'weather', value: weatherScore, label: `Weather: ${weather}` },
    { key: 'traffic', value: trafficScore, label: `Traffic: ${traffic}` },
    { key: 'cargo', value: cargoScore, label: `Cargo sensitivity: ${cargo}` },
    { key: 'route', value: Math.max(0, routeFactor), label: `Route complexity: ${origin} -> ${destination}` },
  ].sort((a, b) => b.value - a.value);

  const primary = factors[0]?.key || 'route';
  let primaryReason = 'Mixed operational constraints on the selected corridor';
  let recommendedAction = 'Keep current route and monitor updates every 4 hours';

  if (primary === 'weather') {
    primaryReason = 'Adverse weather conditions on the primary route';
    recommendedAction = 'Reroute through a weather-safe corridor and stage contingency capacity at next hub';
  } else if (primary === 'traffic') {
    primaryReason = 'Port and inland congestion causing queue delays';
    recommendedAction = 'Shift to congestion-bypass nodes and reserve early unloading slots';
  } else if (primary === 'cargo') {
    primaryReason = 'Cargo handling sensitivity requires slower transfer windows';
    recommendedAction = 'Use priority handling and reduce handoff points to protect cargo integrity';
  }

  const confidence = clamp(
    58 +
      (weather ? 10 : 0) +
      (traffic ? 10 : 0) +
      (cargo ? 8 : 0) +
      (explicitRisk > 0 ? 8 : 0),
    55,
    95
  );

  return {
    delayProbability,
    estimatedDelayHours,
    riskLevel: riskLabelFromScore(delayProbability),
    primaryReason,
    contributingFactors: factors.slice(0, 3).map((f) => f.label),
    recommendedAction,
    alternativeRoutes: [
      `${origin} -> ${getWaypoint(origin, destination, 'weather-safe')} -> ${destination}`,
      `${origin} -> ${getWaypoint(origin, destination, 'traffic-safe')} -> ${destination}`,
    ],
    confidence,
    analysis: `Shipment from ${origin} to ${destination} has a modeled delay risk of ${delayProbability}% for ${cargo}. Main pressure comes from ${primaryReason.toLowerCase()} while carrier context (${carrier}) and corridor complexity influence the final score.`,
  };
};

const buildDynamicRouteOptimization = (data) => {
  const origin = toText(data.origin, 'Unknown Origin');
  const destination = toText(data.destination, 'Unknown Destination');
  const cargoType = toText(data.cargoType || data.cargo, 'general cargo');
  const weather = toText(data.weather, '');
  const traffic = toText(data.traffic, '');
  const issues = toText(data.issues, '');
  const priority = toLowerText(data.priority || 'balanced');
  const routeHash = hashString(`${origin}|${destination}|${cargoType}`);

  const weatherScore = weatherRiskScore(weather || issues);
  const trafficScore = trafficRiskScore(traffic || issues);
  const cargoScore = cargoRiskScore(cargoType);
  const routeComplexity = (routeHash % 14) - 2; // -2..11
  const riskScore = clamp(
    Math.round(18 + weatherScore + trafficScore + cargoScore + routeComplexity + priorityRiskBias(priority)),
    6,
    96
  );

  const baseDays = 6 + (routeHash % 6); // 6..11
  const priorityTimeDelta = priority === 'time' ? -1.8 : priority === 'cost' ? 1.4 : 0;
  const weatherDelayDays = weatherScore / 15;
  const trafficDelayDays = trafficScore / 18;
  const recommendedDays = clamp(baseDays + weatherDelayDays + trafficDelayDays + priorityTimeDelta, 2, 24);

  const costIndex = clamp(
    Math.round((cargoScore + weatherScore / 2 - trafficScore / 3) / 8 + (priority === 'cost' ? -1 : priority === 'time' ? 1 : 0)),
    -2,
    2
  );

  let strategy = 'balanced';
  let name = 'Balanced Reliability Corridor';
  if (weatherScore >= 24) {
    strategy = 'weather-safe';
    name = 'Weather-Safe Diversion Corridor';
  } else if (trafficScore >= 16) {
    strategy = 'traffic-safe';
    name = 'Congestion Bypass Corridor';
  } else if (priority === 'time') {
    strategy = 'fastest';
    name = 'Express Multimodal Corridor';
  } else if (priority === 'cost') {
    strategy = 'lowest-cost';
    name = 'Economy Freight Corridor';
  }

  const recommendedRoute = {
    name,
    path: [origin, getWaypoint(origin, destination, strategy), destination],
    estimatedTime: formatDays(recommendedDays),
    estimatedCost: formatCostLabel(costIndex),
    riskScore,
    pros: [
      `Aligned to ${priority || 'balanced'} priority`,
      weatherScore > 0 ? `Weather-aware routing for "${weather || issues}"` : 'Stable weather exposure',
      trafficScore > 0 ? `Traffic mitigation for "${traffic || issues}"` : 'Low congestion exposure',
    ],
    cons: [
      costIndex > 0 ? 'Higher operating cost than baseline route' : 'May be slower than premium expedited options',
    ],
  };

  const altFastDays = clamp(recommendedDays - 1.6, 1.5, 20);
  const altCheapDays = clamp(recommendedDays + 2.3, 2, 30);
  const altFastRisk = clamp(riskScore + (weatherScore > 16 ? 8 : 3), 5, 99);
  const altCheapRisk = clamp(riskScore + 6, 5, 99);

  const alternativeRoutes = [
    {
      name: 'Express Priority Link',
      path: [origin, getWaypoint(origin, destination, 'fastest'), destination],
      estimatedTime: formatDays(altFastDays),
      estimatedCost: 'Premium (+25%)',
      riskScore: altFastRisk,
      summary: 'Fastest route with premium cost and tighter operational windows.',
    },
    {
      name: 'Economy Consolidation Lane',
      path: [origin, getWaypoint(origin, destination, 'lowest-cost'), destination],
      estimatedTime: formatDays(altCheapDays),
      estimatedCost: 'Economy (-15%)',
      riskScore: altCheapRisk,
      summary: 'Lower transport spend with longer transit and moderate risk trade-off.',
    },
  ];

  const baselineDays = recommendedDays + 1.4;
  const savedDays = Math.max(0.4, baselineDays - recommendedDays);

  return {
    recommendedRoute,
    alternativeRoutes,
    reasoning: `For shipment ${origin} -> ${destination}, the selected route balances weather (${weather || 'normal'}), traffic (${traffic || 'normal'}), cargo type (${cargoType}), and priority (${priority || 'balanced'}). This lowers aggregate risk compared with the baseline lane.`,
    savings: `${savedDays.toFixed(1)} days faster than baseline with ${formatCostLabel(costIndex)} cost profile.`,
  };
};

const sanitizePredictionResponse = (raw, fallbackInput) => {
  if (!raw || typeof raw !== 'object') return buildDynamicPrediction(fallbackInput);

  const fallback = buildDynamicPrediction(fallbackInput);
  const probability = clamp(Math.round(toNumber(raw.delayProbability, fallback.delayProbability)), 0, 100);
  const delayHours = clamp(Math.round(toNumber(raw.estimatedDelayHours, fallback.estimatedDelayHours)), 0, 240);
  const confidence = clamp(Math.round(toNumber(raw.confidence, fallback.confidence)), 0, 100);

  const factors = Array.isArray(raw.contributingFactors)
    ? raw.contributingFactors.map((item) => toText(item)).filter(Boolean).slice(0, 5)
    : fallback.contributingFactors;

  const alternatives = Array.isArray(raw.alternativeRoutes)
    ? raw.alternativeRoutes.map((item) => toText(item)).filter(Boolean).slice(0, 4)
    : fallback.alternativeRoutes;

  return {
    delayProbability: probability,
    estimatedDelayHours: delayHours,
    riskLevel: toText(raw.riskLevel, riskLabelFromScore(probability)),
    primaryReason: toText(raw.primaryReason, fallback.primaryReason),
    contributingFactors: factors.length ? factors : fallback.contributingFactors,
    recommendedAction: toText(raw.recommendedAction, fallback.recommendedAction),
    alternativeRoutes: alternatives.length ? alternatives : fallback.alternativeRoutes,
    confidence,
    analysis: toText(raw.analysis, fallback.analysis),
  };
};

const sanitizeRouteResponse = (raw, fallbackInput) => {
  if (!raw || typeof raw !== 'object' || !raw.recommendedRoute) {
    return buildDynamicRouteOptimization(fallbackInput);
  }

  const fallback = buildDynamicRouteOptimization(fallbackInput);
  const recommendedRaw = raw.recommendedRoute || {};
  const recommendedFallback = fallback.recommendedRoute;

  const recommendedRoute = {
    name: toText(recommendedRaw.name, recommendedFallback.name),
    path: Array.isArray(recommendedRaw.path) && recommendedRaw.path.length >= 2
      ? recommendedRaw.path.map((step) => toText(step)).filter(Boolean)
      : recommendedFallback.path,
    estimatedTime: toText(recommendedRaw.estimatedTime, recommendedFallback.estimatedTime),
    estimatedCost: toText(recommendedRaw.estimatedCost, recommendedFallback.estimatedCost),
    riskScore: clamp(Math.round(toNumber(recommendedRaw.riskScore, recommendedFallback.riskScore)), 0, 100),
    pros: Array.isArray(recommendedRaw.pros) && recommendedRaw.pros.length
      ? recommendedRaw.pros.map((p) => toText(p)).filter(Boolean).slice(0, 4)
      : recommendedFallback.pros,
    cons: Array.isArray(recommendedRaw.cons) && recommendedRaw.cons.length
      ? recommendedRaw.cons.map((c) => toText(c)).filter(Boolean).slice(0, 4)
      : recommendedFallback.cons,
  };

  const alternatives = Array.isArray(raw.alternativeRoutes) && raw.alternativeRoutes.length
    ? raw.alternativeRoutes.slice(0, 3).map((route, index) => {
        const fb = fallback.alternativeRoutes[index] || fallback.alternativeRoutes[0];
        return {
          name: toText(route?.name, fb.name),
          path: Array.isArray(route?.path) && route.path.length >= 2
            ? route.path.map((step) => toText(step)).filter(Boolean)
            : fb.path,
          estimatedTime: toText(route?.estimatedTime, fb.estimatedTime),
          estimatedCost: toText(route?.estimatedCost, fb.estimatedCost),
          riskScore: clamp(Math.round(toNumber(route?.riskScore, fb.riskScore)), 0, 100),
          summary: toText(route?.summary, fb.summary),
        };
      })
    : fallback.alternativeRoutes;

  return {
    recommendedRoute,
    alternativeRoutes: alternatives,
    reasoning: toText(raw.reasoning, fallback.reasoning),
    savings: toText(raw.savings, fallback.savings),
  };
};

/**
 * Generate AI delay prediction for a shipment
 */
const predictDelay = async (shipmentData) => {
  const m = getModel();
  const normalizedInput = {
    trackingNumber: toText(shipmentData.trackingNumber, 'N/A'),
    origin: toText(shipmentData.origin, ''),
    destination: toText(shipmentData.destination, ''),
    cargo: toText(shipmentData.cargo || shipmentData.cargoType, ''),
    weight: toText(shipmentData.weight, 'unknown'),
    carrier: toText(shipmentData.carrier, 'unknown'),
    weather: toText(shipmentData.weather, ''),
    traffic: toText(shipmentData.traffic, ''),
    estimatedDelivery: toText(shipmentData.estimatedDelivery, 'unknown'),
    description: toText(shipmentData.description, ''),
    riskLevel: toNumber(shipmentData.riskLevel, 0),
  };

  const prompt = `You are an expert supply-chain risk analyst.
Use the request data below and compute a fresh, input-specific prediction.
Do not reuse any prior answer.

Shipment from ${normalizedInput.origin} to ${normalizedInput.destination}
Tracking: ${normalizedInput.trackingNumber}
Cargo: ${normalizedInput.cargo}
Weight: ${normalizedInput.weight}
Carrier: ${normalizedInput.carrier}
Weather: ${normalizedInput.weather}
Traffic: ${normalizedInput.traffic}
Current risk score: ${normalizedInput.riskLevel}
ETA: ${normalizedInput.estimatedDelivery}
Notes: ${normalizedInput.description}

Return JSON only:
{
  "delayProbability": <number 0-100>,
  "estimatedDelayHours": <number>,
  "riskLevel": "<low|medium|high|critical>",
  "primaryReason": "<main cause>",
  "contributingFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "recommendedAction": "<specific action>",
  "alternativeRoutes": ["<route1>", "<route2>"],
  "confidence": <number 0-100>,
  "analysis": "<2-3 sentence analysis>"
}`;

  if (!m) {
    return buildDynamicPrediction(normalizedInput);
  }

  try {
    const result = await withTimeout(
      m.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini predictDelay'
    );
    const text = result.response.text().trim();
    const parsed = parseJsonResponse(text);
    return sanitizePredictionResponse(parsed, normalizedInput);
  } catch (err) {
    console.error('Gemini prediction error:', err.message);
    return buildDynamicPrediction(normalizedInput);
  }
};

/**
 * Generate optimized route suggestions
 */
const optimizeRoute = async (routeData) => {
  const m = getModel();
  const normalizedInput = {
    origin: toText(routeData.origin, ''),
    destination: toText(routeData.destination, ''),
    cargoType: toText(routeData.cargoType || routeData.cargo, ''),
    weather: toText(routeData.weather, ''),
    traffic: toText(routeData.traffic, ''),
    issues: toText(routeData.issues, ''),
    priority: toText(routeData.priority || 'balanced', 'balanced'),
  };

  const prompt = `You are a logistics route optimization expert.
Use this exact request and produce an input-specific route plan.
Do not reuse prior output.

Origin: ${normalizedInput.origin}
Destination: ${normalizedInput.destination}
Cargo: ${normalizedInput.cargoType}
Weather: ${normalizedInput.weather}
Traffic: ${normalizedInput.traffic}
Issues: ${normalizedInput.issues}
Priority: ${normalizedInput.priority}

Return JSON only:
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
  "reasoning": "<why this route is best>",
  "savings": "<time/cost savings>"
}`;

  if (!m) {
    return buildDynamicRouteOptimization(normalizedInput);
  }

  try {
    const result = await withTimeout(
      m.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini optimizeRoute'
    );
    const text = result.response.text().trim();
    const parsed = parseJsonResponse(text);
    return sanitizeRouteResponse(parsed, normalizedInput);
  } catch (err) {
    console.error('Gemini route optimization error:', err.message);
    return buildDynamicRouteOptimization(normalizedInput);
  }
};

/**
 * AI chat assistant.
 */
const chat = async (message, conversationHistory = []) => {
  const m = getModel();

  const systemContext = `You are SmartChain AI, a supply-chain assistant.
Be professional, concise, and actionable.`;

  const historyText = conversationHistory
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`)
    .join('\n');

  const prompt = `${systemContext}

${historyText ? `Conversation history:\n${historyText}\n` : ''}
User: ${message}

Answer as SmartChain AI:`;

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

const getMockChatResponse = (message) => {
  const msg = toLowerText(message);
  if (msg.includes('delay') || msg.includes('late')) {
    return 'I can estimate delay risk per shipment using weather, traffic, and cargo sensitivity. Share a shipment id or route details.';
  }
  if (msg.includes('route') || msg.includes('path')) {
    return 'I can compare fastest, balanced, and lowest-cost routes. Provide origin, destination, cargo type, weather, and traffic details.';
  }
  if (msg.includes('risk')) {
    return 'Risk scoring is calculated from live route context, weather severity, traffic load, and cargo profile.';
  }
  return 'I can help with shipment tracking, delay prediction, route optimization, and risk analysis.';
};

module.exports = { predictDelay, optimizeRoute, chat };
