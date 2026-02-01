// app/privacy-policy/page.tsx
import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white text-black min-h-screen max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy for 1018 Shop</h1>

      <p className="mb-4">
        This Privacy Policy describes how <strong>1018 Shop LLC</strong> ("we", "us", or "our") collects, uses, and protects personal information when you use the <strong>1018 Shop</strong> mobile application.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
      <p className="mb-4">
        We may collect information such as your name, email address, phone number, and location when you use the 1018 Shop app.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
      <p className="mb-4">
        Your information is used to provide and improve the 1018 Shop service, send notifications, and ensure user safety.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">3. Data Sharing</h2>
      <p className="mb-4">
        We do not share your personal information with third parties except as required by law or with your explicit consent.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">4. Data Security</h2>
      <p className="mb-4">
        We implement appropriate security measures to protect your information from unauthorized access or disclosure.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">5. Your Rights</h2>
      <p className="mb-4">
        You have the right to access, modify, or delete your personal data by contacting us.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">6. Changes to This Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised date.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">7. Contact Us</h2>
      <p>
        If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us at:{" "}
        <a href="mailto:support@1018shop.mn" className="text-blue-600 underline">support@1018shop.mn</a>
      </p>
    </main>
  );
}
