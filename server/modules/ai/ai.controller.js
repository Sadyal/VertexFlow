import aiService from "./ai.service.js";

const createError = (msg, status) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

/**
 * AI Controller
 * Manages requests for the AI Copilot features
 */
export const handleSummarize = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return next(createError("Text is required for summarization.", 400));
    
    // Safety limit on input size
    if (text.length > 50000) return next(createError("Text is too long. Max 50,000 characters allowed.", 413));

    const result = await aiService.summarize(text);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleImprove = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return next(createError("Text is required.", 400));
    if (text.length > 50000) return next(createError("Text is too long.", 413));

    const result = await aiService.improveWriting(text);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleGenerateIdeas = async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) return next(createError("Topic is required.", 400));

    const result = await aiService.generateIdeas(topic);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleChat = async (req, res, next) => {
  try {
    const { context, query, stream = true } = req.body;
    if (!query) return next(createError("Query is required.", 400));

    const messages = aiService.buildChatMessages(context, query);

    if (stream) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chatStream = await aiService.generateStream(messages);
      
      for await (const chunk of chatStream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    } else {
      const result = await aiService.generateCompletion(messages);
      res.status(200).json({ success: true, data: result });
    }
  } catch (error) {
    // If headers already sent, we can't use next(error) normally
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
      return res.end();
    }
    next(error);
  }
};
