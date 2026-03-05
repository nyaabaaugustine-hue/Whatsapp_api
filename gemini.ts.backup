import { Message, Attachment } from "../types";
import { CAR_DATABASE } from "../data/cars";

const apiKey = import.meta.env.VITE_APIFREELLM_API_KEY || 'apf_ivcabm4cxcdvaxh8ju1gxxji';
const API_URL = 'https://api.apifreellm.com/v1/chat/completions';

const inventory = CAR_DATABASE.map(c => `${c.id}. ${c.year} ${c.brand} ${c.model} - ₵${c.price.toLocaleString()} (${c.mileage.toLocaleString()}km)`).join('\n');

const SYSTEM = `You are Abena, elite car sales consultant for Drivemond Ghana.

CARS: ${inventory}

PERSONALITY: Confident, warm, calm. Never robotic.

FLOW:
1. WELCOME: "Hi! I'm Abena 👋 What's your budget (₵)? What matters most - Fuel, Space, or Comfort? When do you need it - This week, This month, or Browsing?"

2. BUDGET RESPONSE:
   • Under ₵100k: "Smart budget! Reliable, fuel-efficient options."
   • ₵100k-200k: "Excellent range with strong resale."
   • Over ₵200k: "Premium options available."

3. RECOMMEND (MAX 3 CARS):
   Use emotional language: "Toyota Corolla - dependable daily companion with excellent fuel savings"
   Include: ✔ Easy servicing ✔ Available parts ✔ Strong resale
   Add: "Strong demand in Ghana market"

4. CONFIDENCE CLOSE: "Based on what you told me, [car] would be my strongest recommendation."

5. PHOTOS: {"action": "send_car_images", "car_id": "1"}

6. BOOKING MICRO-STEPS:
   "Would weekday or weekend work better?"
   Then: "Morning or afternoon?"
   Then: {"action": "create_booking", "name": "...", "date": "...", "time": "..."}

7. TRUST: "✔ Fully inspected ✔ Transparent pricing ✔ Verified docs"

8. HESITATION: "Would you like me to: Save this, Compare options, Send photos, Schedule call?"

9. ALWAYS END WITH ACTION: "Ready to reserve viewing?" "Want me to narrow this down?"

RULES: Respond to LATEST message. Keep SHORT (2-3 sentences). Show MAX 3 cars. Premium language.`;

export async function sendChatMessage(messages: Message[], newMessage: string, attachment?: Attachment): Promise<string> {
  try {
    const history = messages.map(m => ({role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text}));
    const msgs = [{role: 'system' as const, content: SYSTEM}, ...history, {role: 'user' as const, content: newMessage}];
    const res = await fetch(API_URL, {method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`}, body: JSON.stringify({model: 'gpt-3.5-turbo', messages: msgs, temperature: 0.7, max_tokens: 800, presence_penalty: 0.8, frequency_penalty: 0.5})});
    if (!res.ok) throw new Error(`API failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No response';
  } catch (error: any) {
    console.error('Error:', error);
    return "Connection issue 😔\n\nYou can:\n📞 Call: +233504512884\n💬 Try again";
  }
}
