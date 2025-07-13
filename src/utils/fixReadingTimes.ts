import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with server-side credentials
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

/**
 * Utility script to recalculate and update reading times for all blog posts.
 * Calculates reading time as Math.ceil(wordCount / 250) words per minute.
 * 
 * Usage: Call this function once to update all posts in the database.
 * 
 * @returns {Promise<void>}
 */
export async function fixReadingTimes(): Promise<void> {
  console.log('Starting reading time update for all blog posts...');
  
  // Create server-side Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false  // Disable session persistence for server-side usage
    }
  });
  try {
    console.log('Starting reading time update process...');
    
    // 1. Fetch all blog posts
    const { data: posts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, title, content, reading_time');

    if (fetchError) {
      throw new Error(`Error fetching posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('No blog posts found to update.');
      return;
    }

    console.log(`Found ${posts.length} blog posts to process.`);
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    // 2. Process each post
    for (const post of posts) {
      try {
        if (!post.content) {
          console.warn(`Skipping post "${post.title}" (ID: ${post.id}): No content`);
          continue;
        }

        // 3. Calculate new reading time
        const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
        const newReadingTime = Math.ceil(wordCount / 250);
        
        // Only update if reading time has changed
        if (post.reading_time === newReadingTime) {
          console.log(`No change needed for "${post.title}" (ID: ${post.id}): ${post.reading_time} minutes`);
          unchangedCount++;
          continue;
        }

        // 4. Update the post with new reading time
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ 
            reading_time: newReadingTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        if (updateError) {
          throw new Error(`Error updating post "${post.title}" (ID: ${post.id}): ${updateError.message}`);
        }

        console.log(`Updated "${post.title}" (ID: ${post.id}): ${post.reading_time} → ${newReadingTime} minutes`);
        updatedCount++;

      } catch (error) {
        console.error(`Error processing post "${post?.title || 'Unknown'}" (ID: ${post?.id || 'unknown'}):`, error);
        errorCount++;
      }
    }

    // 5. Log summary
    console.log('\n--- Update Summary ---');
    console.log(`Total posts processed: ${posts.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Already correct: ${unchangedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Fatal error in fixReadingTimes:', error);
    throw error; // Re-throw to indicate failure
  }
}

/**
 * Updates a specific blog post's reading time
 * @param postId The ID of the post to update
 */
export const updateSpecificPost = async (postId: string) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false
    }
  });
  
  console.log(`Updating post ${postId}...`);
  
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ 
      reading_time: 1, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', postId)
    .select();
    
  if (error) {
    console.error('Error updating post:', error);
  } else {
    console.log('Update successful:', data);
  }
  
  return { data, error };
};

// Run the functions when script is executed directly
fixReadingTimes()
  .then(() => console.log('Reading time update completed successfully!'))
  .catch(error => console.error('Failed to update reading times:', error));

// Update specific post
updateSpecificPost('03af533c-4d9b-4869-818e-fe3043bcf8ff')
  .then(() => console.log('Specific post update completed'))
  .catch(console.error);
