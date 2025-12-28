declare module 'cloudflare:test' {
  interface Env {
    DB: D1Database;
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Clerk
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
      CLERK_SECRET_KEY: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: string;
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: string;

      // Stock APIs
      TWELVE_DATA_API_KEY: string;

      // App
      NEXT_PUBLIC_APP_URL: string;
    }
  }
}

export {};
