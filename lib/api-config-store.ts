// In-memory storage for API URLs by tenant
export const apiUrlsByTenant: Record<string, string> = {};

// Default API URL to use if not configured
export const DEFAULT_API_URL = 'https://7c08-2600-1f16-55e-3100-ecd5-e861-2148-fe34.ngrok-free.app';

// Helper functions
export function setApiUrl(tenantId: string, apiUrl: string): void {
  apiUrlsByTenant[tenantId] = apiUrl;
}

export function getApiUrl(tenantId: string): string {
  return apiUrlsByTenant[tenantId] || DEFAULT_API_URL;
}

export function deleteApiUrl(tenantId: string): boolean {
  if (tenantId in apiUrlsByTenant) {
    delete apiUrlsByTenant[tenantId];
    return true;
  }
  return false;
} 