
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
    const requestData = await req.json();
    const { url, method = 'GET', headers = {}, body } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying request to: ${url} with method: ${method}`);

    // Create a safe headers object without CORS headers that might interfere
    const safeHeaders = { ...headers };
    
    // Remove any CORS headers from the request - these are handled by the proxy
    delete safeHeaders['access-control-allow-origin'];
    delete safeHeaders['Access-Control-Allow-Origin'];
    delete safeHeaders['access-control-allow-headers'];
    delete safeHeaders['Access-Control-Allow-Headers'];
    delete safeHeaders['access-control-allow-methods'];
    delete safeHeaders['Access-Control-Allow-Methods'];
    
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...safeHeaders,
        'User-Agent': 'CorsProxy/1.0',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    
    // Get response body as text
    const responseText = await response.text();

    try {
      // Try to parse as JSON
      const responseJson = JSON.parse(responseText);
      return new Response(
        JSON.stringify(responseJson),
        { 
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (e) {
      // Return as text if not valid JSON
      return new Response(
        responseText,
        { 
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/plain'
          }
        }
      );
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
