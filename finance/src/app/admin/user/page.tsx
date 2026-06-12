'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  Select,
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const DRIVER_ROLE_ID = 3;

interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  role_id: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const { modal, message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/user`);
      const result = await res.json();
      if (result.success) {
        setUsers(
          result.data.map((u: User) => ({
            ...u,
            role_id: Number(u.role_id),
            is_active: u.is_active !== false,
          }))
        );
      } else {
        message.error(result.message || 'Хэрэглэгч ачаалахад алдаа гарлаа');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      message.error('Хэрэглэгч ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Хэрэглэгч';
    fetchData();
  }, []);

  const handleDelete = (record: User) => {
    modal.confirm({
      title: 'Устгахдаа итгэлтэй байна уу?',
      icon: <ExclamationCircleOutlined />,
      content: `"${record.username}" устгах`,
      okText: 'Тийм',
      okType: 'danger',
      cancelText: 'Үгүй',
      onOk: async () => {
        const res = await fetch(`${apiBase}/api/user/${record.id}`, {
          method: 'DELETE',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          message.error(json.message || 'Устгахад алдаа гарлаа');
          throw new Error(json.message || 'Delete failed');
        }
        message.success('Амжилттай устгалаа');
        await fetchData();
      },
    });
  };

  const handleCreateUser = () => {
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    form.resetFields();
  };

  const handleToggleActive = async (record: User, checked: boolean) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === record.id ? { ...u, is_active: checked } : u
      )
    );

    try {
      const res = await fetch(`${apiBase}/api/user/${record.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        message.error(json.message || 'Төлөв өөрчлөхөд алдаа гарлаа');
        await fetchData();
        return;
      }
      message.success(checked ? 'Жолооч идэвхжлээ' : 'Жолооч идэвхгүй боллоо');
      await fetchData();
    } catch (err) {
      console.error(err);
      message.error('Төлөв өөрчлөхөд алдаа гарлаа');
      await fetchData();
    }
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();

      const response = await fetch(`${apiBase}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          role_id: Number(values.role_id),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success('Хэрэглэгч амжилттай үүслээ');
        await fetchData();
        handleDrawerClose();
      } else {
        message.error(result.message || 'Алдаа гарлаа');
      }
    } catch (error) {
      console.error('Validation or request failed:', error);
      message.error('Хэлбэр буруу байна');
    }
  };

  const visibleUsers = [...users]
    .filter((u) => Number(u.role_id) !== DRIVER_ROLE_ID || u.is_active !== false)
    .sort((a, b) => {
      if (Number(a.role_id) === DRIVER_ROLE_ID && Number(b.role_id) !== DRIVER_ROLE_ID) return -1;
      if (Number(a.role_id) !== DRIVER_ROLE_ID && Number(b.role_id) === DRIVER_ROLE_ID) return 1;
      return a.username.localeCompare(b.username);
    });

  const columns: ColumnsType<User> = [
    {
      title: 'Username',
      dataIndex: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
    },
    {
      title: 'Role',
      dataIndex: 'role_id',
      render: (role_id: number) => {
        const roles: Record<number, string> = {
          1: 'admin',
          2: 'customer',
          3: 'driver',
        };
        return roles[Number(role_id)] || `Role ${role_id}`;
      },
    },
    {
      title: 'Төлөв',
      key: 'is_active',
      render: (_, record) => {
        if (Number(record.role_id) !== DRIVER_ROLE_ID) return '—';
        return (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              danger={record.is_active}
              type={record.is_active ? 'default' : 'primary'}
              onClick={() => handleToggleActive(record, !record.is_active)}
            >
              {record.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            </Button>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => alert(`Edit ${record.username}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Хэрэглэгч</h1>
      <Space style={{ marginBottom: 16, width: '100%' }} wrap>
        <Button
          type="primary"
          style={{ marginLeft: 'auto' }}
          onClick={handleCreateUser}
        >
          + Хэрэглэгч үүсгэх
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={visibleUsers}
        rowKey="id"
        loading={loading}
      />

      <Drawer
        title="Хэрэглэгч үүсгэх"
        width={400}
        onClose={handleDrawerClose}
        open={drawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Form layout="vertical" form={form} onFinish={handleFormSubmit}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone" />
          </Form.Item>
          <Form.Item name="role_id" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              <Option value={2}>Customer</Option>
              <Option value={3}>Driver</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter a password' }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Хадгалах
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
