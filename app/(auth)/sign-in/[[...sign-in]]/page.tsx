import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-800">
      <SignIn
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 shadow-xl',
          },
        }}
      />
    </div>
  );
}
