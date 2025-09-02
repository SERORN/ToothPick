// Simple session mock for testing the Academy
// Replace with actual authentication system

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface Session {
  user: User;
}

export function useSession() {
  // Mock session for testing - replace with real authentication
  const mockSession: Session = {
    user: {
      id: "user_123",
      name: "Usuario Demo",
      email: "demo@toothpick.com",
      role: "patient"
    }
  };

  return {
    data: mockSession,
    status: "authenticated"
  };
}
