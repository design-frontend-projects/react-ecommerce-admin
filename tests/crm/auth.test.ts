import { describe, it, expect } from 'vitest';
import { requireCRMAuth } from '@/utils/auth/crmAuth';

describe('CRM Role-Based Access Control', () => {
  it('should allow access for admin role', async () => {
    const mockRequest = {
      headers: new Headers({
        'x-user-role': 'admin'
      })
    } as unknown as Request;

    const result = requireCRMAuth(mockRequest);
    expect(result).toBe(true);
  });

  it('should allow access for manager role', async () => {
    const mockRequest = {
      headers: new Headers({
        'x-user-role': 'manager'
      })
    } as unknown as Request;

    const result = requireCRMAuth(mockRequest);
    expect(result).toBe(true);
  });

  it('should deny access for standard users', async () => {
    const mockRequest = {
      headers: new Headers({
        'x-user-role': 'user'
      })
    } as unknown as Request;

    expect(() => requireCRMAuth(mockRequest)).toThrow('Unauthorized access to CRM module');
  });

  it('should deny access if no role is provided', async () => {
    const mockRequest = {
      headers: new Headers()
    } as unknown as Request;

    expect(() => requireCRMAuth(mockRequest)).toThrow('Unauthorized access to CRM module');
  });
});
