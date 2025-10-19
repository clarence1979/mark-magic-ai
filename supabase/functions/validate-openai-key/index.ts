import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('Received validation request');
    
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      console.log('Missing or invalid apiKey in request');
      return new Response(
        JSON.stringify({ valid: false, error: 'API key is required' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!apiKey.startsWith('sk-')) {
      console.log('API key does not start with sk-');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid API key format. OpenAI keys start with sk-' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Validating API key with OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('OpenAI error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      let errorMessage = 'Invalid API key';

      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
      } else if (response.status === 403) {
        errorMessage = 'API key does not have proper permissions.';
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }

      return new Response(
        JSON.stringify({ valid: false, error: errorMessage }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('API key validation successful');
    
    return new Response(
      JSON.stringify({ valid: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Validation Error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate API key' 
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});