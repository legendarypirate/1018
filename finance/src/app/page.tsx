'use client';

import React, { useState, useEffect,FormEvent } from 'react';
import Head from 'next/head';
import { Form, Input, Button, Checkbox, Card, notification } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation'; // for Next.js 13 app router

interface Order {
  id: number;
  phone: string;
  address: string;
  status: string;
  created_at: string;
}


export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    setTitle('Нэвтрэх');
    document.title = 'Нэвтрэх';
  }, []);

  const openNotification = (type: 'success' | 'error', messageText: string) => {
    notification.open({
      message: null,
      description: <div style={{ color: 'white' }}>{messageText}</div>,
      duration: 4,
      style: {
        backgroundColor: type === 'success' ? '#52c41a' : '#ff4d4f',
        borderRadius: '4px',
      },
      closeIcon: <CloseOutlined style={{ color: '#fff' }} />,
    });
  };
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
      if (!username || !password) {
        openNotification('error', 'Нэвтрэх нэр болон нууц үгээ оруулна уу!');
        return;
      }

      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          openNotification('error', 'API холбоос тохируулаагүй байна.');
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
          openNotification('success', 'Амжилттай нэвтрэлээ!');

          const { token, user } = data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('permissions', JSON.stringify(user.permissions));
          localStorage.setItem('role', user.role?.toString() ?? '');
          localStorage.setItem('username', user.username);

          router.push('/admin');
        } else {
          openNotification('error', data.message || 'Нэвтрэх нэр эсвэл нууц үг буруу байна!');
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            openNotification('error', 'Холболт удаан боллоо. Дахин оролдоно уу.');
          } else {
            console.error(error);
            openNotification('error', 'Сервертэй холбогдож чадсангүй!');
          }
        } else {
          openNotification('error', 'Сервертэй холбогдож чадсангүй!');
        }
      } finally {
        setLoading(false);
      }
    };
  const handleCheckSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrders(null);
    setModalOpen(true);

    try {
      const res = await fetch("/api/delivery/check-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // add CSRF token if needed here
        },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) throw new Error("Алдаа гарлаа. Дахин оролдоно уу.");

      const data: Order[] = await res.json();

      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        openNotification('success', 'Амжилттай нэвтэрлээ!');

        // Optionally store token and user info (e.g., in localStorage)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/admin'); // Navigate after success

        // You can redirect here if needed, e.g., using next/router
        // router.push('/dashboard');
      } else {
        openNotification('error', 'Нэвтрэх нэр эсвэл нууц үг буруу байна!');
      }
    } catch (error) {
      openNotification('error', 'Сервертэй холбогдож чадсангүй!');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    openNotification('error', 'Та бүх талбарыг зөв бөглөнө үү!');
  };

  return (
    <>
     
     <div
  className="min-h-screen w-screen bg-cover bg-center flex items-center justify-end px-4"
  style={{ backgroundImage: 'url(/zs.png)' }}
>
          <div className="max-w-sm bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600 mr-200">
            <h5 className="mb-4 text-lg font-semibold flex items-center gap-2 text-black">
              🚚 Захиалга шалгах
            </h5>
            <form onSubmit={handleCheckSubmit} className="mb-6">
              <input
                type="text"
                name="phone"
                placeholder="Утасны дугаар"
                className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-600 text-black"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                disabled={loading}
              >
                Шалгах
              </button>
            </form>

            {/* Modal */}
            {modalOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setModalOpen(false)}
              >
                <div
                  className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-white bg-blue-600 px-4 py-2 rounded text-black">
                      Захиалгын мэдээлэл
                    </h5>
                    <button
                      className="text-black hover:text-gray-600 text-xl font-bold"
                      onClick={() => setModalOpen(false)}
                      aria-label="Close modal"
                    >
                      &times;
                    </button>
                  </div>

                  <div>
                    {loading && (
                      <p className="text-center text-gray-700">Уншиж байна...</p>
                    )}
                    {error && (
                      <div className="alert alert-danger text-center text-red-600">
                        {error}
                      </div>
                    )}
                    {!loading && !error && orders && orders.length === 0 && (
                      <div className="alert alert-warning text-center text-yellow-700">
                        Хайлтаар илэрсэн захиалга алга
                      </div>
                    )}
                    {/* {!loading && !error && orders && orders.length > 0 && (
                      <ul className="divide-y divide-gray-200">
                        {orders.map((order) => {
                          const statusText = getStatusText(order.status);
                          const statusClass = getStatusClass(order.status);

                          return (
                            <li
                              key={order.id}
                              className="py-4 flex justify-between items-center"
                            >
                              <div>
                                <p>
                                  <strong>ID:</strong> {order.id}
                                </p>
                                <p>
                                  <strong>Утас:</strong> {order.phone}
                                </p>
                                <p>
                                  <strong>Хаяг:</strong> {order.address}
                                </p>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-sm font-semibold ${statusClass}`}
                                >
                                  Төлөв: {statusText}
                                </span>
                              </div>
                              <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )} */}
                  </div>
                </div>
              </div>
            )}

            <hr className="my-6" />
            <h5 className="mb-4 text-lg font-semibold text-black">🔐 Нэвтрэх</h5>
          <form onSubmit={handleLogin}>
  <div className="mb-3">
    <input
      type="text"
      name="name"
      placeholder="Name"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 text-black"
      required
    />
  </div>
  <div className="mb-3">
    <input
      type="password"
      name="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 text-black"
      required
    />
  </div>
  <button
    type="submit"
    disabled={loading}
    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-black"
  >
    {loading ? 'Уншиж байна...' : 'Нэвтрэх'}
  </button>
</form>

          </div>
        </div>
    </>
  );
}
