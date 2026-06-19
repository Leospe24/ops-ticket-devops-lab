import { describe, it, expect } from 'vitest';
import { api } from './api';

describe('API Client', () => {
  it('exports api object with auth and ticket methods', () => {
    expect(api).toBeDefined();
    expect(typeof api.register).toBe('function');
    expect(typeof api.login).toBe('function');
    expect(typeof api.getTickets).toBe('function');
    expect(typeof api.createTicket).toBe('function');
    expect(typeof api.updateTicket).toBe('function');
    expect(typeof api.getStats).toBe('function');
    expect(typeof api.logout).toBe('function');
    expect(typeof api.isAuthenticated).toBe('function');
  });

  it('handles network errors gracefully', async () => {
    // fetch will fail because there's no server in test env
    // The handleResponse should throw a user-friendly error
    await expect(api.getStats()).rejects.toThrow('Unable to connect to the API server');
  });
});