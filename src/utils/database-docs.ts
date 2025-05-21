
/**
 * Database columns documentation
 * 
 * This file documents the purpose of various columns in the Supabase database
 * to provide clarity on their usage and prevent accidental removal.
 */

/**
 * conversations table
 * 
 * is_completed: Boolean flag to indicate if a mystery has been fully completed
 *   - Currently defaults to false
 *   - Could be used to mark mysteries that have been run with guests
 *   - Distinguishes from mysteries that are just created or purchased
 * 
 * mystery_id: UUID reference to connect related mysteries
 *   - Currently null for all records
 *   - Could be used to create "sequel" mysteries or variations
 *   - Could link to a parent template mystery
 * 
 * prompt_version: Text field to track which prompt template was used
 *   - Currently null for all records
 *   - Useful for tracking which version of the AI prompt created this mystery
 *   - Important for debugging and quality tracking
 * 
 * system_instruction: Text field containing AI chat system instructions
 *   - Contains the basic instructions for the AI when generating mysteries
 *   - All have similar content as they use the same base template
 *   - Critical for consistent AI behavior in the chat interface
 * 
 * display_status: Text field for UI display status 
 *   - Values: "draft", "purchased", "archived"
 *   - Used to filter mysteries in the UI
 */

/**
 * messages table
 * 
 * is_ai: Boolean flag to indicate if a message is from the AI
 *   - Currently false for many records due to a bug in message creation
 *   - Should be true for AI-generated messages and false for user messages
 *   - Used for styling and organizing the chat interface
 */

/**
 * prompts table
 * 
 * Purpose: Stores reusable prompt templates for AI interactions
 *   - Contains named prompt templates that can be referenced
 *   - Allows for versioning and updating of prompts without changing code
 *   - Makes it easier to experiment with different prompt strategies
 */

/**
 * mystery_characters table
 * 
 * Scalability notes:
 *   - The table is designed to handle thousands of entries
 *   - With 1000 mysteries and 10 characters each, the table would have 10,000 rows
 *   - This is well within PostgreSQL's capabilities (which can handle millions)
 *   - The UI implements pagination to handle large datasets
 *   - Performance will remain good with proper indexing on frequently queried columns
 */

export const DatabaseColumnPurposes = {
  conversations: {
    is_completed: "Flag to mark mysteries that have been fully completed with guests",
    mystery_id: "Reference to connect related mysteries or variations",
    prompt_version: "Tracks which version of the AI prompt created this mystery",
    system_instruction: "Contains the base instructions for the AI when generating mysteries",
    display_status: "UI display status (draft, purchased, archived)"
  },
  
  messages: {
    is_ai: "Indicates if a message is from the AI (true) or user (false)"
  },
  
  prompts: {
    purpose: "Stores reusable AI prompt templates with versioning capabilities"
  },
  
  mystery_characters: {
    scalability: "Designed to handle thousands of entries with good performance"
  }
};
