/**
 * API Configuration
 *
 * Handles different API endpoints based on environment:
 * - Development: Uses proxy (localhost)
 * - Production: Uses worker URL
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// In production, we need to use the full API URL
// In development, we use the relative path (proxied by Vite)
export const getApiBaseUrl = () => {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  // Check if we're in production (Pages deployment)
  if (window.location.hostname === 'makerlog-dashboard.pages.dev' ||
      window.location.hostname === 'makerlog.ai' ||
      !window.location.hostname.includes('localhost')) {
    // Use the deployed worker URL
    return 'https://makerlog-api-v2.casey-digennaro.workers.dev';
  }

  // Development: use relative path (proxied by Vite)
  return '/api';
};

export const API_BASE = getApiBaseUrl();
