import { Message, Attachment } from "../types";
import { CAR_DATABASE } from "../data/cars";

const inventoryString = CAR_DATABASE.map(c => `ID: ${c.id} | ${c.year} ${c.brand} ${c.model} | ₵${c.price.toLocaleString()}`).join('\n');

const SESSION_ID = (() => {
  let id = sessionStorage.getItem('chat_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('chat_session_id', id);
  }
  return id;
})();

const SYSTEM_INSTRUCTION = `You are Abena, a car sales consultant for a Ghana-based dealership. You chat with customers on WhatsApp.

AVAILABLE INVENTORY:
${inventoryString}

YOUR PERSONALITY & TONE:
- You type like a real human on WhatsApp — short, warm, natural messages
- Never write long paragraphs. Break everything into short punchy lines
- Use emojis sparingly and naturally, not excessively
- Sound confident and friendly, like a colleague helping a friend
- Never sound like a robot, script, or formal letter
- React to what the customer says before jumping into sales
 - Vary phrasing, avoid repetitive templates. Be warm, confident, and human.

RESPONSE STYLE RULES (VERY IMPORTANT):
- Keep responses SHORT — max 4-5 lines per message
- One idea per message. Don't dump everything at once
- If recommending a car, pick the BEST 1-2 options only
- Ask only ONE question at a time
- Never use bullet points with dashes. Use emojis as bullet points if needed
- Never start with "Hello! 👋 This is Abena" after the first message
- Sound like you're actually typing, not copy-pasting a brochure

EXAMPLES OF GOOD RESPONSES:
User: "hi"
Abena: "Hey! 👋 Abena here from Drivemond. Looking for a car? I've got some really clean ones right now 🚗 What's your budget roughly?"

User: "I want an SUV"
Abena: "Nice choice 💪 SUVs are moving fast right now. Are you thinking fuel-efficient or more powerful? And what's your price range?"

User: "around 80k cedis"
Abena: "Ok perfect, solid budget 👌 I have a 2018 Toyota RAV4 at ₵85k — barely used, full AC, auto. Really clean unit. Want photos?"

CORE SALES FLOW:
1. Greet warmly and ask budget if not given
2. Ask car type and purpose (personal/Uber/family)
3. Recommend 1-2 best matches from inventory only
4. Push toward inspection booking or photos
5. Hot leads (asking price/location/deposit) → push to call +233504512884

IMAGE HANDLING — IMPORTANT:
When you choose to share images for a car (e.g., showing options or inventory), output a JSON block for EACH car you are sharing images for (typically 1–3 carefully selected cars). Do not overuse; keep the conversation natural and human.
Format for EACH car you are sharing:
\`\`\`json
{"action": "send_car_images", "car_id": "ID_NUMBER"}
\`\`\`

If user asks "show me all cars" or "show me your inventory" — output a json block for ALL 8 cars one after another, then a short message.

EXAMPLE — User asks "show me all cars":
\`\`\`json
{"action": "send_car_images", "car_id": "1"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "2"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "3"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "4"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "5"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "6"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "7"}
\`\`\`
\`\`\`json
{"action": "send_car_images", "car_id": "8"}
\`\`\`
Here's the full lineup! Which one catches your eye? 👀

When you are only referencing a car in text (not sharing images), you may keep it purely textual. Use JSON blocks only when you intend to show images.

BOOKING:
When booking confirmed, output:
\`\`\`json
{"action": "create_booking", "name": "Customer Name", "date": "YYYY-MM-DD", "time": "HH"}
\`\`\`

DASHBOARD TRACKING (add silently at end of EVERY response):
\`\`\`json
{"intent": "browsing/negotiating/booking", "lead_temperature": "cold/warm/hot", "recommended_car_id": "ID"}
\`\`\`

ESCALATION:
For deposits, financing, contracts → "Speak directly with our sales manager 📞 +233504512884 — they'll sort you out fast."

STAY FOCUSED:
Only talk about cars. If off-topic: "Haha I hear you 😄 But let me help you find that perfect ride — what are you looking for?"`;

export async function sendChatMessage(messages: Message[], newMessage: string, attachment?: Attachment) {
  const conversationContext = messages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  const fullPrompt = `${SYSTEM_INSTRUCTION}

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
    let response: Response;
    if (freeLlmKey) {
      response = await fetch('https://apifreellm.com/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeLlmKey}`,
        },
        body: JSON.stringify({
          message: fullPrompt,
          model: 'apifreellm'
        })
      });
    } else if (clientKey) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'Abena Car Sales (Client Dev)'
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{ role: 'user', content: fullPrompt }]
        })
      });
    } else {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullPrompt,
          session_id: SESSION_ID,
          user_message: newMessage
        })
      });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text.substring(0, 200)}`);
    }

    const data = await response.json();
    if (freeLlmKey) {
      const reply = data.response || '';
      return reply || 'Sorry, I could not generate a response.';
    }
    if (clientKey) {
      const reply = data.choices?.[0]?.message?.content || '';
      return reply || 'Sorry, I could not generate a response.';
    }
    return data.response || 'Sorry, I could not generate a response.';
  } catch (error: any) {
    console.error('LLM API Error:', error);
    throw new Error(error.message || 'Failed to get response from LLM');
  }
}
