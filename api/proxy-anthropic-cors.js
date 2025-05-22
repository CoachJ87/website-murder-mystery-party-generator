
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*', // More permissive for debugging
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    console.log("proxy-anthropic-cors: Processing request");
    
    // Get request body
    let body;
    try {
      body = await req.json();
      console.log("Request body received and parsed");
    } catch (e) {
      console.error("Invalid JSON body:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Forward request to Supabase Edge Function
    const { url, method = 'POST', headers = {}, data } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`Forwarding request to: ${url}`);

    // Create safe headers
    const forwardHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      // Add all headers except Host which can cause issues
      if (key.toLowerCase() !== 'host') {
        forwardHeaders.append(key, value);
      }
    }
    
    // Add user agent header for tracking
    forwardHeaders.append('User-Agent', 'NextJsProxy/1.0');
    
    // Add Content-Type if not present and we have data
    if (data && !forwardHeaders.has('content-type')) {
      forwardHeaders.append('Content-Type', 'application/json');
    }
    
    // Set a timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Call the target URL
    try {
      const response = await fetch(url, {
        method,
        headers: forwardHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // Forward response
      const responseBody = await response.text();
      console.log(`Response received, status: ${response.status}, length: ${responseBody.length}`);

      // Try to parse as JSON
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
        console.log("Response successfully parsed as JSON");
        return new Response(JSON.stringify(parsedBody), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        console.log("Response is not valid JSON, returning as text");
        // Return as text if not valid JSON
        return new Response(responseBody, {
          status: response.status,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (fetchError) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      console.error("Fetch error:", fetchError);
      
      // Handle abort errors specially
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: "Request timed out", 
          timeoutMs: 30000 
        }), {
          status: 504, // Gateway Timeout
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      throw fetchError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Proxy error:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      trace: error.stack 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
