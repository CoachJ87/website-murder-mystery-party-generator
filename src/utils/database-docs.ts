
/**
 * Database Schema Documentation
 * 
 * This file documents the purpose of each table and column in the Supabase database.
 * It serves as a reference for developers working on the project.
 */

export const databaseDocumentation = {
  conversations: {
    id: "Primary key, UUID for the conversation",
    user_id: "Foreign key to the users table, identifies the owner of the conversation",
    title: "Display title for the mystery conversation",
    created_at: "Timestamp when the conversation was created",
    updated_at: "Timestamp when the conversation was last updated",
    display_status: "Status shown on the dashboard (draft, purchased, archived)",
    is_completed: "Boolean flag indicating if the mystery has been fully completed by the user. Currently unused but could be used to track completion status of mystery creation.",
    mystery_id: "Optional reference to another mystery. Could be used for related mysteries or templates. Currently unused but kept for future implementations.",
    prompt_version: "Version of the prompt template used for this conversation. Useful for tracking which AI prompt version was used. Currently unused but kept for backward compatibility.",
    system_instruction: "The system instruction sent to the AI for this conversation. Contains the context and formatting instructions for the AI.",
    mystery_data: "JSON object containing additional data about the mystery like theme, player count, etc.",
    webhook_sent: "Boolean indicating if this mystery has been sent to an external webhook",
    webhook_sent_at: "Timestamp when the mystery was sent to the webhook"
  },
  
  messages: {
    id: "Primary key, UUID for the message",
    conversation_id: "Foreign key to the conversations table",
    created_at: "Timestamp when the message was created",
    content: "Text content of the message",
    role: "Role of the message sender (user or assistant)",
    is_ai: "Boolean flag indicating if the message is from the AI. This field should be true for messages where role='assistant', but there might be data inconsistencies. The application logic has been updated to handle both fields correctly."
  },
  
  prompts: {
    id: "Primary key, UUID for the prompt",
    name: "Name of the prompt template",
    content: "Content of the prompt template",
    created_at: "Timestamp when the prompt was created",
    updated_at: "Timestamp when the prompt was last updated",
    description: "Description of what this prompt template is used for",
    version: "Version number of this prompt template",
    is_active: "Whether this prompt template is currently active"
  },
  
  mystery_characters: {
    /**
     * Note on mystery_characters table scaling:
     * This table is designed to handle a large number of entries (10,000+).
     * The database can easily handle this volume, and the application uses pagination
     * where needed. Performance optimizations such as indexes are in place.
     */
    id: "Primary key, UUID for the character",
    mystery_id: "Foreign key to the mysteries table",
    name: "Character name",
    description: "Character description",
    is_murderer: "Boolean flag indicating if this character is the murderer",
    is_victim: "Boolean flag indicating if this character is the victim",
    is_accomplice: "Boolean flag indicating if this character is an accomplice",
    secrets: "JSON array of character secrets",
    relationships: "JSON array describing relationships to other characters",
    goals: "Character goals during the mystery",
    created_at: "Timestamp when the character was created",
    updated_at: "Timestamp when the character was last updated"
  }
};

export default databaseDocumentation;
