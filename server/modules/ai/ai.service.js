import Groq from "groq-sdk";

/**
 * AI Service for Workspace Copilot
 * Now powered by Groq (Llama 3.3 70B)
 */
class AIService {
  constructor() {
    this.groq = null;
    this.primaryModel = "llama-3.3-70b-versatile";
    this.fallbackModel = "llama3-8b-8192";
  }

  ensureConfigured() {
    if (!this.groq) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        const error = new Error("Groq API key is missing. AI features disabled.");
        error.status = 503;
        throw error;
      }
      this.groq = new Groq({ apiKey });
    }
  }

  /**
   * Universal completion handler for static (non-streamed) responses
   */
  async generateCompletion(messages, model = this.primaryModel) {
    this.ensureConfigured();
    try {
      const completion = await this.groq.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[Groq Service Error]:", error?.message);
      // Fallback to smaller model if primary fails (e.g. rate limit)
      if (model === this.primaryModel) {
        return this.generateCompletion(messages, this.fallbackModel);
      }
      throw error;
    }
  }

  /**
   * Streaming completion handler
   */
  async generateStream(messages, model = this.primaryModel) {
    this.ensureConfigured();
    try {
      return await this.groq.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      });
    } catch (error) {
      console.error("[Groq Stream Error]:", error?.message);
      throw error;
    }
  }

  async summarize(text) {
    const messages = [
      { role: "system", content: "You are a professional editor. Summarize the text concisely. Output raw text only." },
      { role: "user", content: `Text to summarize: ${text}` }
    ];
    return this.generateCompletion(messages);
  }

  async improveWriting(text) {
    const messages = [
      { role: "system", content: "You are an elite copywriter. Improve the grammar and tone. Return ONLY the edited text." },
      { role: "user", content: `Text to improve: ${text}` }
    ];
    return this.generateCompletion(messages);
  }

  async generateIdeas(topic) {
    const messages = [
      { role: "system", content: "You are a creative strategist. Return 5 actionable ideas in a bulleted list." },
      { role: "user", content: `Topic: ${topic}` }
    ];
    return this.generateCompletion(messages);
  }

  /**
   * Formats chat payload for Groq
   */
  buildChatMessages(context, query) {
    const systemPrompt = `You are VertexFlow AI, a premium SaaS workspace assistant.
Rules:
1. Answer accurately and intelligently.
2. Use document context ONLY when relevant to the user's intent.
3. NEVER refuse general knowledge questions.
4. If context helps, use it naturally.
5. Be concise and professional.`;

    const messages = [{ role: "system", content: systemPrompt }];
    
    if (context && context.trim() !== "") {
      messages.push({ role: "user", content: `Document Context:\n${context}` });
    }
    
    messages.push({ role: "user", content: query });
    return messages;
  }
}

export default new AIService();
