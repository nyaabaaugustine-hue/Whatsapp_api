import { Message, Attachment } from "../types";
import { CAR_DATABASE } from "../data/cars";

const inventoryString = CAR_DATABASE.map(c => `ID: ${c.id} | ${c.year} ${c.brand} ${c.model} | â‚µ${c.price.toLocaleString()}`).join('\n');

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

const SESSION_ID = (() => {
  let id = sessionStorage.getItem('chat_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('chat_session_id', id);
  }
  return id;
})();

const SYSTEM_INSTRUCTION = `DRIVEMOND AI DEALER - UNIFIED SYSTEM PROMPT
You are Abena, a professional, intelligent automotive sales advisor for Drivemond Ghana.

You are a knowledgeable, trustworthy Ghana-based car dealer - not a robotic bot.

AVAILABLE INVENTORY:
${inventoryString}

You understand detailed vehicle knowledge including:
- Vehicle type (SUV, Sedan, Luxury, Pickup)
- Engine and fuel type
- Transmission
- Mileage
- Price
- Affordability level
- Maintenance profile
- Spare parts availability in Ghana
- Mechanic familiarity in Ghana
- Fuel efficiency rating
- Resale strength in Ghana market
- Road suitability (city, highway, rough roads)
- Best use case (family, ride-hailing, business, executive, heavy duty)

TONE & STYLE:
- Professional, warm, confident
- WhatsApp-friendly, short lines
- Ask only ONE question at a time
- Guide with structured choices when possible
- Keep it consultative, not pushy
- Do not repeat the same prompt twice

CORE BEHAVIOR:
1) Start with purpose before budget: Family, Business, Ride-hailing, Executive, Personal use.
2) Ask what matters most (Fuel Efficiency, Easy Maintenance, Strong Resale Value, Comfort, Power, Business Use).
3) Ask if paying full or financing, then budget range and preferred type.
4) Recommend based on needs, not random.
5) Prioritize Ghana market realities: road conditions, parts access, mechanic familiarity, resale strength.
6) Position every car positively using sales psychology.
7) Never use negative sales words: "expensive", "bad resale", "high fuel consumption", "difficult parts", "problem".
8) Reframe as: "premium ownership level", "power-oriented performance", "specialist service category",
   "luxury segment maintenance profile", "strong value-focused option".

SMART MEMORY:
- Remember budget, preferred car type, priority, financing choice, and location.
- Reference them naturally: "Since you mentioned fuel efficiency earlier..."

COMPARE MODE:
- If user asks to compare, give a clear, structured comparison and end with a confident recommendation.

FINANCING:
- If financing, provide an estimated monthly payment and offer a finance advisor.

CONFIDENCE & TRUST:
- Add ownership confidence messaging (parts access, maintenance ease, Ghana support).
- Include trust signals like "clean title verified", "transparent pricing", "inspection completed".
- Add a soft "hot deal" nudge when appropriate (strong interest this week).

LOCATION AWARENESS:
- If user mentions Accra: "Available for viewing in East Legon."
- If outside Accra: "We offer nationwide delivery."

TEST DRIVE FLOW:
- Use premium phrasing: "Let's reserve your preferred time before it gets booked."

OBJECTION HANDLING:
- If user hesitates ("let me think"): offer to save the option or send more details.

LUXURY MODE:
- If luxury, use shorter, refined language and premium tone.

MICRO-ENGAGEMENT:
- If user goes quiet or seems unsure, ask: "Would you like me to compare these options for you?"

CLOSING:
- Never end a reply without a clear next step:
  Reserve Private Viewing / See More Photos / Talk to Sales

IMAGE HANDLING:
Only attach car images when the user asks for photos/seeing options, or after you propose 1–2 cars and they say yes.
Format for EACH car you are sharing (JSON):
{"action": "send_car_images", "car_id": "ID_NUMBER"}

BOOKING:
When booking confirmed, output (JSON):
{"action": "create_booking", "name": "Customer Name", "date": "YYYY-MM-DD", "time": "HH"}

DASHBOARD TRACKING (add silently at end of EVERY response, JSON):
{"intent": "browsing/negotiating/booking", "lead_temperature": "cold/warm/hot", "recommended_car_id": "ID", "lead_score": 0}

ESCALATION:
For deposits, financing, contracts -> "Speak directly with our sales manager +233504512884 - they'll sort you out fast."

STAY FOCUSED:
Only talk about cars. If off-topic: "I hear you. But let me help you find that perfect ride - what are you looking for?"`;

function parseBuyerProfile(input: string): string | undefined {
  const s = input.toLowerCase();
  if (s.includes('first') || s.includes('first-time')) return 'First-Time Buyer';
  if (s.includes('family')) return 'Family Upgrade';
  if (s.includes('business owner') || s.includes('business')) return 'Business Owner';
  if (s.includes('uber') || s.includes('bolt') || s.includes('ride-hailing') || s.includes('ride hailing')) return 'Ride-Hailing Driver';
  if (s.includes('executive') || s.includes('luxury')) return 'Executive Buyer';
  return undefined;
}

function parsePriority(input: string): string | undefined {
  const s = input.toLowerCase();
  if (s.includes('fuel')) return 'Fuel Efficiency';
  if (s.includes('maintenance') || s.includes('service')) return 'Easy Maintenance';
  if (s.includes('resale') || s.includes('resell')) return 'Strong Resale Value';
  if (s.includes('comfort')) return 'Comfort';
  if (s.includes('power') || s.includes('performance')) return 'Power';
  if (s.includes('business use') || s.includes('business')) return 'Business Use';
  return undefined;
}

function parseFinancing(input: string): 'full' | 'financing' | undefined {
  const s = input.toLowerCase();
  if (s.includes('finance') || s.includes('financing') || s.includes('installment') || s.includes('monthly')) return 'financing';
  if (s.includes('cash') || s.includes('full') || s.includes('pay in full')) return 'full';
  return undefined;
}

function parseCarType(input: string): string | undefined {
  const s = input.toLowerCase();
  if (s.includes('suv')) return 'SUV';
  if (s.includes('sedan')) return 'Sedan';
  if (s.includes('luxury')) return 'Luxury';
  if (s.includes('pickup') || s.includes('pick up') || s.includes('truck')) return 'Pickup';
  return undefined;
}

function parseBudget(input: string): number | undefined {
  const match = input.match(/(\d[\d,.\s]*)(\s*[kKmM])?/);
  if (!match) return undefined;
  const raw = match[1].replace(/[,.\s]/g, '');
  let val = parseInt(raw, 10);
  if (isNaN(val)) return undefined;
  const suffix = (match[2] || '').trim().toLowerCase();
  if (suffix === 'k') val *= 1000;
  if (suffix === 'm') val *= 1000000;
  return val;
}

function parseLocation(input: string): string | undefined {
  const s = input.toLowerCase();
  if (s.includes('accra') || s.includes('east legon') || s.includes('tema') || s.includes('spintex') || s.includes('airport') || s.includes('madina')) return 'Accra';
  if (s.includes('kumasi') || s.includes('takoradi') || s.includes('tamale') || s.includes('cape coast') || s.includes('sunyani') || s.includes('koforidua')) return 'Outside Accra';
  return undefined;
}

export async function sendChatMessage(messages: Message[], newMessage: string, attachment?: Attachment, leadName?: string) {
  const conversationContext = messages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  const allText = [...messages.map(m => m.text), newMessage].join('\n');
  const memory = {
    buyerProfile: parseBuyerProfile(allText),
    priority: parsePriority(allText),
    financing: parseFinancing(allText),
    carType: parseCarType(allText),
    budget: parseBudget(allText),
    location: parseLocation(allText),
  };

  const localDemo = "Hello, Abena here from Drivemond.\nWhat best describes your purpose - family, business, ride-hailing, executive, or personal use?";
  if (typeof navigator !== 'undefined' && navigator?.onLine === false) {
    return localDemo;
  }

  const fullPrompt = `${SYSTEM_INSTRUCTION}

Customer name (use naturally, not every message): ${leadName || 'unknown'}
Known memory (use if present):
${JSON.stringify(memory)}

Previous conversation:
${conversationContext}

User: ${newMessage}

Abena (reply like a real human typing on WhatsApp, keep it short and natural):`;

  try {
    const freeLlmKey = (() => {
      try { return localStorage.getItem('APIFREELLM_API_KEY') || ''; } catch { return ''; }
    })();
    const clientKey = (() => {
      try { return localStorage.getItem('OPENROUTER_API_KEY') || ''; } catch { return ''; }
    })();
    // Attempt chain: FreeLLM â†’ OpenRouter (client) â†’ Backend â†’ Local demo
    if (freeLlmKey) {
      try {
        const response = await fetchWithTimeout('https://apifreellm.com/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freeLlmKey}`,
          },
          body: JSON.stringify({ message: fullPrompt, model: 'apifreellm' })
        }, 15000);
        if (response.ok) {
          const data = await response.json();
          const reply = data.response || '';
          if (reply) return `${reply}\n\`\`\`json\n{"provider_used":"apifreellm"}\n\`\`\``;
        }
      } catch {}
    }
    if (clientKey) {
      try {
        const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            'X-Title': 'Abena Car Sales (Client Dev)'
          },
          body: JSON.stringify({ model: 'openrouter/auto', messages: [{ role: 'user', content: fullPrompt }] })
        }, 15000);
        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          if (reply) return `${reply}\n\`\`\`json\n{"provider_used":"openrouter_client"}\n\`\`\``;
        }
      } catch {}
    }
    try {
      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullPrompt, session_id: SESSION_ID, user_message: newMessage })
      }, 20000);
      if (response.ok) {
        const data = await response.json();
        const reply = data.response || '';
        if (reply) return `${reply}\n\`\`\`json\n{"provider_used":"backend"}\n\`\`\``;
      }
    } catch {}
    return `${localDemo}\n\`\`\`json\n{"provider_used":"local_demo","fallback_used":true}\n\`\`\``;
  } catch (error: any) {
    console.error('LLM API Error:', error);
    return `${localDemo}\n\`\`\`json\n{"provider_used":"local_demo","fallback_used":true}\n\`\`\``;
  }
}




