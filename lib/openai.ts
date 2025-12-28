/**
 * OpenAI client configuration and utilities
 */

import OpenAI from 'openai';

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Default to gpt-4o-mini, can be overridden via env
  translationModel: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini', // Default to gpt-4o-mini, can be overridden via env
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '300000', 10), // Default 5 minutes (300000ms) - recipe analysis can take time
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2', 10), // Default 2 retries
};

let _openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
export function getOpenAIClient(): OpenAI {
  if (!OPENAI_CONFIG.apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      timeout: OPENAI_CONFIG.timeout,
      maxRetries: OPENAI_CONFIG.maxRetries,
    });
  }
  
  return _openaiClient;
}

export const openaiClient = getOpenAIClient();

