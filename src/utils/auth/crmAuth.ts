export function requireCRMAuth(request: Request): boolean {
  // In a real application, this would decode a JWT or session cookie.
  // For the sake of this CRM spec module, we'll check a mock header.
  const role = request.headers.get('x-user-role');
  
  if (role === 'admin' || role === 'manager') {
    return true;
  }
  
  throw new Error('Unauthorized access to CRM module');
}
