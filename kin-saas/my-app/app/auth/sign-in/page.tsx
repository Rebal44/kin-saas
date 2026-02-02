import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-black">Kin</Link>
          <p className="mt-2 text-gray-600">Welcome back</p>
        </div>
        <SignIn appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-lg rounded-2xl border-0",
          }
        }} />
      </div>
    </div>
  );
}
