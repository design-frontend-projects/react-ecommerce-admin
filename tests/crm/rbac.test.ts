import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone } from '@/utils/piiMasker';

describe('CRM PII Masking', () => {
  it('masks emails correctly', () => {
    expect(maskEmail('john.doe@example.com')).toBe('jo***@example.com');
    expect(maskEmail('ab@test.com')).toBe('***@test.com');
    expect(maskEmail(null)).toBe('');
  });

  it('masks phone numbers correctly', () => {
    expect(maskPhone('1234567890')).toBe('***-***-7890');
    expect(maskPhone('+19876543210')).toBe('***-***-3210');
    expect(maskPhone('1234')).toBe('***');
    expect(maskPhone('')).toBe('');
  });
});
