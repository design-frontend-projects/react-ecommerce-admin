import React, { useEffect, useState } from 'react';

// Mock authentication check hook for frontend
function useAuthRole() {
  // Hardcoded for demonstration, ideally from an auth provider (Clerk/Supabase)
  return { role: 'admin', loading: false };
}

export function withCRMAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithCRMAuth(props: P) {
    const { role, loading } = useAuthRole();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      if (!loading) {
        if (role === 'admin' || role === 'manager') {
          setAuthorized(true);
        }
      }
    }, [role, loading]);

    if (loading) return <div>Loading CRM...</div>;
    if (!authorized) return <div className="p-6 text-red-500">Access Denied: Requires Manager or Admin role.</div>;

    return <WrappedComponent {...props} />;
  };
}
