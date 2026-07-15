declare global {
  namespace Express {
    interface Request {
      requestId: string;
      sessionToken?: string;
      currentUser?: {
        id: string;
        email: string;
        name: string;
        role: 'ADMIN' | 'CUSTOMER';
        isActive: boolean;
      } | null;
    }
  }
}

export {};
