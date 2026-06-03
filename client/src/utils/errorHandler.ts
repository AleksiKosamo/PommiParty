/**
 * Global error handling utilities
 */

import { logger } from '../logger';

export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason);
    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    logger.error('Global error:', event.error);
  });
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Socket.io errors
    if (error.message.includes('ECONNREFUSED')) {
      return 'Palvelimeen ei voi muodostaa yhteyttä. Varmista, että palvelin on käynnissä.';
    }
    if (error.message.includes('timeout')) {
      return 'Yhteys palvelimeen aikakatkaistiin. Tarkista verkkosi.';
    }
    return error.message;
  }
  if (typeof error === 'string') return error;
  return 'Tuntematon virhe. Yritä uudelleen.';
}
