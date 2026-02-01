// app/support/page.tsx
import React from "react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-bold mb-4 text-center">Support</h1>

      <p className="text-center max-w-2xl mb-6">
        Welcome to the <strong>1018shop Delivery</strong> Support page.
        <br />
        If you have any issues, questions, or feedback about our app, please
        contact us using the details below.
      </p>

      <div className="bg-gray-100 p-6 rounded-2xl shadow-md text-center">
        <p className="mb-2">
          📧 Email:{" "}
          <a
            href="mailto:support@1018shop.mn"
            className="text-blue-600 hover:underline"
          >
            support@1018shop.mn
          </a>
        </p>
        <p className="mb-2">📞 Phone: +976 9986-0997</p>
        <p>🏢 Address: Ulaanbaatar, Mongolia</p>
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-blue-600 hover:underline font-medium"
      >
        ← Back to Home
      </Link>
    </main>
  );
}
