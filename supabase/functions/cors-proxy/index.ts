
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use more permissive CORS headers to avoid issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*', // Allow all headers for debugging
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData, null, 2).substring(0, 200) + "...");
    } catch (e) {
      console.error("Error parsing JSON:", e.message);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { url, method = 'GET', headers = {}, body } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying request to: ${url} with method: ${method}`);

    // Create a safe headers object without CORS headers that might interfere
    const safeHeaders = new Headers();
    
    // Copy provided headers but exclude CORS-related ones
    for (const [key, value] of Object.entries(headers)) {
      if (!key.toLowerCase().startsWith('access-control-')) {
        safeHeaders.append(key, value);
      }
    }
    
    // Add a user agent
    safeHeaders.append('User-Agent', 'CorsProxy/1.0');
    
    // Handle request body
    let requestBody = undefined;
    if (body) {
      if (typeof body === 'object') {
        requestBody = JSON.stringify(body);
        
        // Ensure content-type is set for JSON
        if (!safeHeaders.has('content-type')) {
          safeHeaders.append('Content-Type', 'application/json');
        }
      } else {
        requestBody = String(body);
      }
    }

    // Log the request we're about to make
    console.log(`Fetch request: ${method} ${url}`);
    console.log(`Headers: ${[...safeHeaders.entries()].map(([k,v]) => `${k}: ${v}`).join(', ')}`);

    // Set a timeout for the fetch operation with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (increased from 30s)

    const fetchOptions: RequestInit = {
      method,
      headers: safeHeaders,
      body: requestBody,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId); // Clear the timeout
      
      // Get response body
      let responseBody;
      const contentType = response.headers.get('content-type') || '';
      
      console.log(`Response status: ${response.status}, content type: ${contentType}`);
      
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
          console.log("Response JSON:", JSON.stringify(responseBody).substring(0, 100) + "...");
          return new Response(
            JSON.stringify(responseBody),
            { 
              status: response.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } catch (e) {
          // If JSON parsing fails, fall back to text
          responseBody = await response.text();
          console.log(`JSON parse error: ${e.message}. Falling back to text`);
        }
      } else {
        responseBody = await response.text();
        console.log(`Response text length: ${responseBody.length}`);
      }

      // If we got here, return as text
      return new Response(
        typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
        { 
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': contentType || 'text/plain'
          }
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId); // Clear the timeout
      console.error(`Fetch error: ${fetchError.message}`);
      throw new Error(`Fetch operation failed: ${fetchError.message}`);
    }
  } catch (error) {
    console.error(`Error in cors-proxy: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
