// Make sure you pass the correct messages array to handleAIResponse
const handleAIResponse = async (userMessage: string) => {
  try {
    setLoading(true);
    // Include the new user message in the messages array passed to getAIResponse
    const updatedMessages = [...messages, {
      id: Date.now().toString(),
      content: userMessage,
      is_ai: false,
      timestamp: new Date()
    }];
    
    const response = await getAIResponse(
      updatedMessages.map(m => ({ is_ai: m.is_ai, content: m.content })),
      'free'
    );

    const aiMessage = {
      id: Date.now().toString(),
      content: response,
      is_ai: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    if (onSave) {
      onSave([...updatedMessages, aiMessage]);
    }
  } catch (error) {
    console.error("Error getting AI response:", error);
    toast.error("Failed to get AI response");
  } finally {
    setLoading(false);
  }
};
