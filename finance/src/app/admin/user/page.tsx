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
  Modal,
  message,
  Switch,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { confirm } = Modal;

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

const DRIVER_ROLE_ID = 3;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  // ✅ Reusable fetch function
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);
      const result = await res.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        console.error('Failed to load users:', result.message);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load users on page load
  useEffect(() => {
    document.title = 'Хэрэглэгч';
    fetchData();
  }, []);

  const handleDelete = (record: User) => {
    confirm({
      title: 'Устгахдаа итгэлтэй байна уу?',
      icon: <ExclamationCircleOutlined />,
      content: `"${record.username}" устгах`,
      okText: 'Тийм',
      okType: 'danger',
      cancelText: 'Үгүй',
      onOk: async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/${record.id}`,
            { method: 'DELETE' }
          );
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          message.success('Амжилттай устгалаа');
          fetchData(); // ✅ refresh after delete
        } catch (err) {
          console.error(err);
          message.error('Устгахад алдаа гарлаа');
        }
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
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/${record.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: checked }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      message.success(checked ? 'Жолооч идэвхжлээ' : 'Жолооч идэвхгүй боллоо');
      fetchData();
    } catch (err) {
      console.error(err);
      message.error('Төлөв өөрчлөхөд алдаа гарлаа');
    }
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success('Хэрэглэгч амжилттай үүслээ');
        fetchData(); // ✅ refresh after create
        handleDrawerClose();
      } else {
        console.error('Failed to create user:', result.message);
        message.error(result.message || 'Алдаа гарлаа');
      }
    } catch (error) {
      console.error('Validation or request failed:', error);
      message.error('Хэлбэр буруу байна');
    }
  };

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
        return roles[role_id] || `Role ${role_id}`;
      },
    },
    {
      title: 'Төлөв',
      key: 'is_active',
      render: (_, record) => {
        if (record.role_id !== DRIVER_ROLE_ID) return '—';
        const active = record.is_active !== false;
        return (
          <Space>
            <Switch
              checked={active}
              onChange={(checked) => handleToggleActive(record, checked)}
            />
            <Tag color={active ? 'green' : 'default'}>
              {active ? 'Идэвхтэй' : 'Идэвхгүй'}
            </Tag>
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
      <style>{`
        .driver-disabled-row td {
          opacity: 0.55;
        }
      `}</style>
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
        dataSource={[...users].sort((a, b) => {
          if (a.role_id === DRIVER_ROLE_ID && b.role_id !== DRIVER_ROLE_ID) return -1;
          if (a.role_id !== DRIVER_ROLE_ID && b.role_id === DRIVER_ROLE_ID) return 1;
          const aActive = a.is_active !== false ? 1 : 0;
          const bActive = b.is_active !== false ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          return a.username.localeCompare(b.username);
        })}
        rowKey="id"
        loading={loading}
        rowClassName={(record) =>
          record.role_id === DRIVER_ROLE_ID && record.is_active === false
            ? 'driver-disabled-row'
            : ''
        }
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
              <Option value={1}>Admin</Option>
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
