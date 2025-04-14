// services/aiService.js
import Anthropic from '@anthropic-ai/sdk';

// This will use environment variables configured in your deployment platform
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages, promptVersion) => {
  try {
    // Get the appropriate system prompt based on promptVersion
    const systemPrompt = promptVersion === 'paid' 
      ? "You are an AI assistant that helps create detailed murder mystery party games. Since the user has purchased, provide complete character details, clues, and all game materials."
      : "You are an AI assistant that helps create murder mystery party games. Create an engaging storyline and suggest character ideas, but don't provide complete details as this is a preview.";
    
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229", // Or a more cost-effective model like claude-3-haiku
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content
      })),
      max_tokens: 1000,
    });
    
    return response.content[0].text;
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    throw error;
  }
};
