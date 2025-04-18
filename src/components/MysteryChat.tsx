useEffect(() => {
    console.log("DEBUG: Initial prompt creation effect", {
        messagesLength: messages.length,
        initialMessageSent,
        messagesInitialized: messagesInitialized.current,
        isLoadingHistory,
        theme: initialTheme,
        aiHasResponded: aiHasRespondedRef.current,
        initialMessagesLength: initialMessages.length
    });

    if (messages.length > 0 || initialMessageSent || messagesInitialized.current || isLoadingHistory) {
        console.log("DEBUG: Skipping initial message creation - condition failed");
        return;
    }

    if (initialTheme && initialMessages.length === 0 && !isLoadingHistory) { // Added !isLoadingHistory check
        console.log("DEBUG: Creating initial message with theme:", initialTheme);
        let initialChatMessage = `Let's create a murder mystery`;
        if (initialTheme) initialChatMessage += ` with a ${initialTheme} theme`;
        if (initialPlayerCount) initialChatMessage += ` for ${initialPlayerCount} players`;
        if (initialHasAccomplice !== undefined) initialChatMessage += initialHasAccomplice ? `, including an accomplice` : `, without an accomplice`;
        if (initialScriptType) initialChatMessage += ` with ${initialScriptType} scripts`;
        if (initialAdditionalDetails) initialChatMessage += `. Additional details: ${initialAdditionalDetails}`;
        initialChatMessage += ".";

        console.log("DEBUG: Initial chat message:", initialChatMessage);

        const initialMessage: Message = {
            id: Date.now().toString(),
            content: initialChatMessage,
            is_ai: false,
            timestamp: new Date(),
        };

        console.log("DEBUG: Setting initial user message:", initialMessage);
        setMessages([initialMessage]);
        setInitialMessageSent(true);
        messagesInitialized.current = true;

        if (!aiHasRespondedRef.current) {
            console.log("DEBUG: About to call handleAIResponse with initial message");
            handleAIResponse(initialMessage.content);
        } else {
            console.log("DEBUG: Skipping AI response for initial message - AI has already responded");
        }
    } else if (initialMessages.length > 0 && !messagesInitialized.current) {
        console.log("DEBUG: Initial messages were provided, skipping initial prompt creation for theme");
        setMessages(initialMessages);
        if (initialMessages.length > 0) {
            const lastMessage = initialMessages[initialMessages.length - 1];
            aiHasRespondedRef.current = !!lastMessage.is_ai;
            console.log("DEBUG: Last message is from AI:", !!lastMessage.is_ai);
        }
        setInitialMessageSent(true);
        messagesInitialized.current = true;
    }
}, [initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, messages.length, initialMessageSent, isLoadingHistory, initialMessages]);
