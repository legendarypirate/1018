'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { App } from 'antd';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { message: msg } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = 'Нэвтрэх';
  }, []);

  const doLogin = async () => {
    if (!username || !password) {
      msg.error('Нэвтрэх нэр болон нууц үгээ оруулна уу!');
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        msg.error('API холбоос тохируулаагүй байна.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
        credentials: 'omit',
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok && data.success) {
        msg.success('Амжилттай нэвтрэлээ!');
        const { token, user } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('permissions', JSON.stringify(user.permissions));
        localStorage.setItem('role', user.role?.toString() ?? '');
        localStorage.setItem('username', user.username);
        router.push('/admin');
      } else {
        msg.error(data.message || 'Нэвтрэх нэр эсвэл нууц үг буруу байна!');
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          msg.error('Холболт удаан боллоо. Дахин оролдоно уу.');
        } else {
          console.error(error);
          msg.error('Сервертэй холбогдож чадсангүй!');
        }
      } else {
        msg.error('Сервертэй холбогдож чадсангүй!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTimeout(() => doLogin(), 50);
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: 'url(/zs.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-sm bg-white bg-opacity-90 rounded-2xl shadow-xl p-8 border-l-4 border-green-500 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          🔐 Нэвтрэх
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Нэвтрэх нэр"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-gray-700"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Нууц үг"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-gray-700"
              required
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setTimeout(() => doLogin(), 50);
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl shadow-md transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-700 text-sm">
          Хэрэв та бүртгэлгүй бол админтай холбогдоно уу.
        </p>
      </div>
    </div>
  );
}
