'use client';
import { useRef } from 'react';

import { ConfigProvider } from 'antd';
import React from 'react';
import './globals.css'; // ✅ Import your reset
import dynamic from 'next/dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConfigProvider>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
