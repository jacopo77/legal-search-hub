import { SignInForm } from "@/components/auth/sign-in-form";

// /sign-in — passwordless entry point for firm owners and admins. Not
// linked in the nav; owners arrive here from their magic-link emails or
// when a link expires.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        No password needed — enter the email you listed your firm with and
        we&apos;ll send you a sign-in link.
      </p>
      <div className="mt-6">
        <SignInForm hasLinkError={error === "link"} />
      </div>
    </div>
  );
}
