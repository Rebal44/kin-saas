import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-black">Kin</Link>
          <p className="mt-2 text-gray-600">Create your account</p>
          <p className="text-sm text-gray-500">14-day free trial, no credit card required</p>
        </div>
        <SignUp appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-lg rounded-2xl border-0",
          }
        }} />
      </div>
    </div>
  );
}
