import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';

interface AdminDeleteContextType {
  verifyCode: (code: string) => boolean;
  requestCode: () => void;
  hasRequestedCode: boolean;
}

const AdminDeleteContext = createContext<AdminDeleteContextType | null>(null);

// Generate a random 6-character alphanumeric code
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function AdminDeleteProvider({ children }: { children: ReactNode }) {
  // Fixed admin delete code - provided once in the chat, never displayed in app
  const deleteCode = 'XK7P3M';
  const [hasRequestedCode, setHasRequestedCode] = useState(false);

  const verifyCode = useCallback((code: string): boolean => {
    return code.toUpperCase() === deleteCode;
  }, []);

  const requestCode = useCallback(() => {
    if (hasRequestedCode) {
      toast.info('Der Code wurde bereits angefordert. Er wurde dir einmalig im Chat mitgeteilt.');
      return;
    }
    
    setHasRequestedCode(true);
    toast.info('Der Admin-Code wurde dir einmalig im Chat mitgeteilt und ist dort zu finden.');
  }, [hasRequestedCode]);

  return (
    <AdminDeleteContext.Provider value={{ verifyCode, requestCode, hasRequestedCode }}>
      {children}
    </AdminDeleteContext.Provider>
  );
}

export function useAdminDelete() {
  const context = useContext(AdminDeleteContext);
  if (!context) {
    throw new Error('useAdminDelete must be used within an AdminDeleteProvider');
  }
  return context;
}
