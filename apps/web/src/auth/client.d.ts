export declare const authClient: {
  useSession: () => {
    data: {
      user: {
        id: string;
        name: string;
        email: string;
        handle?: string;
        role?: "user" | "admin";
        image?: string | null;
      };
    } | null;
    isPending: boolean;
    error: unknown;
  };
  signIn: {
    email: (input: {
      email: string;
      password: string;
    }) => Promise<{ error?: { message?: string } | null }>;
  };
  signUp: {
    email: (input: {
      email: string;
      password: string;
      name: string;
      handle: string;
    }) => Promise<{ error?: { message?: string } | null }>;
  };
  signOut: () => Promise<void>;
};
