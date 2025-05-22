
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    } catch (e) {
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
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
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

    const fetchOptions: RequestInit = {
      method,
      headers: safeHeaders,
      body: requestBody,
    };

    const response = await fetch(url, fetchOptions);
    
    // Get response body
    let responseBody;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
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
      }
    } else {
      responseBody = await response.text();
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
