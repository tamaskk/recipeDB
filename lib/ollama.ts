/**
 * Ollama client configuration and utilities
 */

export const OLLAMA_CONFIG = {
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'gpt-oss:120b-cloud',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10), // Default 5 minutes
  maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '2', 10), // Default 2 retries
};

/**
 * Call Ollama API to generate a response
 */
export async function callOllama(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    format?: 'json';
    stream?: boolean;
    onChunk?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const model = options.model || OLLAMA_CONFIG.model;
  const temperature = options.temperature ?? 0.7;
  const format = options.format || undefined;
  const stream = options.stream ?? false;
  const onChunk = options.onChunk;

  const url = `${OLLAMA_CONFIG.host}/api/generate`;
  
  const body: any = {
    model,
    prompt,
    stream,
    options: {
      temperature,
    },
  };

  if (format === 'json') {
    body.format = 'json';
  }

  try {
    // For streaming, we need to handle timeouts differently
    // Don't abort the fetch itself, but track activity on the stream
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    // For non-streaming, use AbortController
    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;
    
    if (!stream) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), OLLAMA_CONFIG.timeout);
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(url, fetchOptions);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    if (stream && response.body) {
      // Handle streaming response - no fetch timeout, but track stream activity
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let lastActivityTime = Date.now();
      const timeout = OLLAMA_CONFIG.timeout;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        while (true) {
          // Use Promise.race to timeout if reader.read() takes too long
          const readPromise = reader.read();
          
          // Clear previous timeout if it exists
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reader.cancel();
              reject(new Error(`Ollama streaming request timed out after ${timeout}ms (no data received)`));
            }, timeout);
          });

          const { done, value } = await Promise.race([readPromise, timeoutPromise]);
          
          // Clear timeout since we got data
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          if (done) break;
          
          // Reset activity timer when we receive data
          lastActivityTime = Date.now();
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                fullResponse += json.response;
                // Stream to console for real-time visibility (like ChatGPT)
                if (typeof process !== 'undefined' && process.stdout) {
                  process.stdout.write(json.response);
                }
                if (onChunk) {
                  onChunk(json.response);
                }
              }
              if (json.done) {
                if (typeof process !== 'undefined' && process.stdout) {
                  process.stdout.write('\n'); // New line when done
                }
                break;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reader.releaseLock();
      }

      return fullResponse;
    } else {
      // Handle non-streaming response
      const data = await response.json();
      return data.response || '';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${OLLAMA_CONFIG.timeout}ms`);
    }
    throw error;
  }
}

/**
 * Retry wrapper for Ollama calls with exponential backoff
 */
export async function retryOllamaCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = OLLAMA_CONFIG.maxRetries,
  timeout: number = OLLAMA_CONFIG.timeout
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptNumber = attempt + 1;
    console.log(`[OLLAMA] Starting Ollama call (attempt ${attemptNumber}/${maxRetries + 1}), timeout: ${timeout}ms`);
    
    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;
      console.log(`[OLLAMA] Call completed successfully in ${duration}ms (attempt ${attemptNumber})`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const errorMessage = lastError.message.toLowerCase();
      
      console.error(`[OLLAMA] Call failed (attempt ${attemptNumber}):`, {
        error: lastError.message,
      });
      
      // Check for non-retryable errors
      const isNonRetryableError = 
        errorMessage.includes('invalid') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('404');
      
      // Check if it's a retryable error
      const isRetryableError = !isNonRetryableError && (
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('enotfound')
      );
      
      if (!isRetryableError || attempt === maxRetries) {
        console.error(`[OLLAMA] Not retrying - shouldRetry: ${isRetryableError}, attempt: ${attemptNumber}/${maxRetries + 1}`);
        throw lastError;
      }

      // Exponential backoff: wait 2^attempt seconds (with max 30 seconds)
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`[RETRY] Ollama call failed (attempt ${attemptNumber}/${maxRetries + 1}), retrying in ${delayMs}ms...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Unknown error in retry wrapper');
}

/**
 * Check if Ollama is accessible and model is available
 */
export async function checkOllamaConnection(): Promise<{ connected: boolean; model?: string; error?: string }> {
  try {
    const url = `${OLLAMA_CONFIG.host}/api/tags`;
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return {
        connected: false,
        error: `Ollama API returned status ${response.status}`,
      };
    }

    const data = await response.json();
    const models = data.models || [];
    const modelExists = models.some((m: any) => m.name === OLLAMA_CONFIG.model || m.name.startsWith(OLLAMA_CONFIG.model));

    if (!modelExists && models.length > 0) {
      return {
        connected: true,
        model: OLLAMA_CONFIG.model,
        error: `Model ${OLLAMA_CONFIG.model} not found. Available models: ${models.map((m: any) => m.name).join(', ')}`,
      };
    }

    return {
      connected: true,
      model: OLLAMA_CONFIG.model,
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      return {
        connected: false,
        error: `Cannot connect to Ollama at ${OLLAMA_CONFIG.host}. Make sure Ollama is running.`,
      };
    }
    
    return {
      connected: false,
      error: `Failed to connect to Ollama: ${errorMessage}`,
    };
  }
}
