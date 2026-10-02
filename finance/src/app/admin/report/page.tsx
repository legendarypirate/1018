'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  notification,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  MailOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const DRIVER_FEE = 8000;
const MERCHANT_FEE = 7000;
const ORDER_FEE = 5000;

type ReportType = 'driver' | 'now' | 'later' | 'merchant';

interface UserOption {
  id: number;
  username: string;
  email?: string | null;
}

interface Delivery {
  id: number;
  merchant_id?: number;
  driver_id?: number | null;
  phone: string;
  address: string;
  price: number | string;
  status: number | string;
  createdAt: string;
  updatedAt?: string;
  delivered_at?: string;
  merchant?: {
    username?: string;
    report_price?: number;
  };
  driver?: {
    username?: string;
  };
  status_name?: {
    status?: string;
  };
}

interface Order {
  id: number;
  merchant_id?: number;
  driver_id?: number | null;
  status: number | string;
  merchant?: { username?: string };
  driver?: { username?: string };
}

interface ReportRow {
  key: string;
  dateRange: string;
  name: string;
  merchantId?: number;
  email?: string;
  totalDeliveries: number;
  deliveredDeliveries: number;
  status5Deliveries: number;
  orderCount: number;
  totalPrice: number;
  salary: number;
}

interface StoredUser {
  id?: number;
  username?: string;
  role?: number;
  role_id?: number;
}

const money = (value: number) => `${Math.round(value).toLocaleString()} ₮`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Тодорхойгүй алдаа';

const getAuthHeaders = (): Record<string, string> => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [deliveriesByMerchantId, setDeliveriesByMerchantId] = useState<
    Record<number, Delivery[]>
  >({});

  const [user, setUser] = useState<StoredUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [drivers, setDrivers] = useState<UserOption[]>([]);
  const [merchants, setMerchants] = useState<UserOption[]>([]);
  const [reportType, setReportType] = useState<ReportType>('driver');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs(),
  ]);

  const isCustomer = user?.role === 2 || user?.role_id === 2;
  const effectiveType: ReportType = isCustomer ? 'merchant' : reportType;
  const isMerchantReport = !isCustomer && effectiveType !== 'driver';

  const notify = (
    type: 'success' | 'error' | 'warning',
    description: string
  ) => notification[type]({ message: description, placement: 'topRight' });

  useEffect(() => {
    document.title = 'Тайлан';
    try {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : {});
    } catch {
      setUser({});
    } finally {
      setUserLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userLoaded || isCustomer) return;

    const loadOptions = async () => {
      try {
        const headers = getAuthHeaders();
        const [driverResponse, merchantResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/drivers`, {
            headers,
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/merchant`, {
            headers,
          }),
        ]);
        const [driverResult, merchantResult] = await Promise.all([
          driverResponse.json(),
          merchantResponse.json(),
        ]);
        setDrivers(
          driverResult.success && Array.isArray(driverResult.data)
            ? driverResult.data
            : []
        );
        setMerchants(
          merchantResult.success && Array.isArray(merchantResult.data)
            ? merchantResult.data
            : []
        );
      } catch (error) {
        console.error('Report filter options error:', error);
        notify('error', 'Жолооч, харилцагчийн мэдээлэл ачаалсангүй');
      }
    };

    void loadOptions();
  }, [isCustomer, userLoaded]);

  useEffect(() => {
    setSelectedId(null);
    setSelectedMerchantIds([]);
    setReportData([]);
  }, [reportType]);

  const loadReportData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      notify('warning', 'Огноо сонгоно уу');
      return;
    }

    setLoading(true);
    setSelectedMerchantIds([]);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const merchantId =
        isCustomer && user?.id
          ? user.id
          : effectiveType !== 'driver'
            ? selectedId
            : null;
      const driverId = effectiveType === 'driver' ? selectedId : null;

      const deliveryParams = new URLSearchParams({
        page: '1',
        limit: '10000',
        startDate,
        endDate,
        statusIds: '3,5',
      });
      if (merchantId) deliveryParams.set('merchantId', String(merchantId));
      if (driverId) deliveryParams.set('driverId', String(driverId));

      const orderParams = new URLSearchParams({
        page: '1',
        limit: '10000',
        start_date: startDate,
        end_date: endDate,
        status_ids: '3',
      });
      if (merchantId) orderParams.set('merchant_id', String(merchantId));
      if (driverId) orderParams.set('driver_id', String(driverId));

      const headers = getAuthHeaders();
      const [deliveryResponse, orderResponse] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/delivery/findAllWithDate?${deliveryParams}`,
          { headers }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/order?${orderParams}`,
          { headers }
        ),
      ]);

      const [deliveryResult, orderResult] = await Promise.all([
        deliveryResponse.json(),
        orderResponse.json(),
      ]);

      if (!deliveryResponse.ok || !deliveryResult.success) {
        throw new Error(
          deliveryResult.message || 'Хүргэлтийн мэдээлэл ачаалсангүй'
        );
      }
      if (!orderResponse.ok || !orderResult.success) {
        throw new Error(
          orderResult.message || 'Захиалгын мэдээлэл ачаалсангүй'
        );
      }

      const deliveries: Delivery[] = Array.isArray(deliveryResult.data)
        ? deliveryResult.data
        : [];
      const orders: Order[] = Array.isArray(orderResult.data)
        ? orderResult.data
        : [];

      const getDeliveryKey = (delivery: Delivery) =>
        effectiveType === 'driver'
          ? String(delivery.driver_id ?? delivery.driver?.username ?? 'none')
          : String(delivery.merchant_id ?? delivery.merchant?.username ?? 'none');
      const getOrderKey = (order: Order) =>
        effectiveType === 'driver'
          ? String(order.driver_id ?? order.driver?.username ?? 'none')
          : String(order.merchant_id ?? order.merchant?.username ?? 'none');

      const deliveredGroups: Record<string, Delivery[]> = {};
      const status5Groups: Record<string, Delivery[]> = {};
      const orderGroups: Record<string, Order[]> = {};

      deliveries.forEach((delivery) => {
        const status = Number(delivery.status);
        const target = status === 3 ? deliveredGroups : status5Groups;
        const key = getDeliveryKey(delivery);
        (target[key] ||= []).push(delivery);
      });
      orders
        .filter((order) => Number(order.status) === 3)
        .forEach((order) => {
          const key = getOrderKey(order);
          (orderGroups[key] ||= []).push(order);
        });

      let keys = Array.from(
        new Set([
          ...Object.keys(deliveredGroups),
          ...Object.keys(status5Groups),
          ...Object.keys(orderGroups),
        ])
      );

      if (!isCustomer && (effectiveType === 'now' || effectiveType === 'later')) {
        keys = keys.filter((key) => {
          const delivered = deliveredGroups[key] || [];
          const totalPrice = delivered.reduce(
            (sum, item) => sum + Number(item.price || 0),
            0
          );
          const fee =
            delivered[0]?.merchant?.report_price || MERCHANT_FEE;
          const difference = totalPrice - delivered.length * fee;
          return effectiveType === 'now'
            ? difference >= 0
            : difference < 0;
        });
      }

      const rows = keys
        .map((key): ReportRow => {
          const delivered = deliveredGroups[key] || [];
          const status5 = status5Groups[key] || [];
          const groupedOrders = orderGroups[key] || [];
          const sampleDelivery = delivered[0] || status5[0];
          const sampleOrder = groupedOrders[0];
          const merchantId =
            sampleDelivery?.merchant_id ?? sampleOrder?.merchant_id;
          const merchant = merchants.find(
            (item) => item.id === Number(merchantId)
          );
          const name =
            effectiveType === 'driver'
              ? sampleDelivery?.driver?.username ||
                sampleOrder?.driver?.username ||
                'Жолоочгүй'
              : isCustomer
                ? user?.username || sampleDelivery?.merchant?.username || '—'
                : merchant?.username ||
                  sampleDelivery?.merchant?.username ||
                  sampleOrder?.merchant?.username ||
                  'Харилцагчгүй';
          const totalPrice = delivered.reduce(
            (sum, item) => sum + Number(item.price || 0),
            0
          );
          const fee =
            effectiveType === 'driver'
              ? DRIVER_FEE
              : sampleDelivery?.merchant?.report_price || MERCHANT_FEE;
          const salary =
            (delivered.length + status5.length) * fee +
            groupedOrders.length * ORDER_FEE;

          return {
            key: `${effectiveType}-${key}`,
            dateRange: `${startDate} ~ ${endDate}`,
            name,
            merchantId:
              effectiveType === 'driver' ? undefined : Number(merchantId) || undefined,
            email: merchant?.email || '',
            totalDeliveries: delivered.length + status5.length,
            deliveredDeliveries: delivered.length,
            status5Deliveries: status5.length,
            orderCount: groupedOrders.length,
            totalPrice,
            salary,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'mn'));

      const merchantDeliveryMap: Record<number, Delivery[]> = {};
      if (effectiveType !== 'driver') {
        keys.forEach((key) => {
          const combined = [
            ...(deliveredGroups[key] || []),
            ...(status5Groups[key] || []),
          ];
          const id = combined[0]?.merchant_id;
          if (id) merchantDeliveryMap[id] = combined;
        });
      }

      setReportData(rows);
      setDeliveriesByMerchantId(merchantDeliveryMap);
    } catch (error) {
      console.error('Report load error:', error);
      setReportData([]);
      setDeliveriesByMerchantId({});
      notify('error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoaded) void loadReportData();
    // Initial report intentionally runs once after the stored user is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded]);

  const totals = useMemo(
    () =>
      reportData.reduce(
        (result, row) => ({
          totalDeliveries: result.totalDeliveries + row.totalDeliveries,
          deliveredDeliveries:
            result.deliveredDeliveries + row.deliveredDeliveries,
          status5Deliveries:
            result.status5Deliveries + row.status5Deliveries,
          orderCount: result.orderCount + row.orderCount,
          totalPrice: result.totalPrice + row.totalPrice,
          salary: result.salary + row.salary,
          difference:
            result.difference + (row.totalPrice - row.salary),
        }),
        {
          totalDeliveries: 0,
          deliveredDeliveries: 0,
          status5Deliveries: 0,
          orderCount: 0,
          totalPrice: 0,
          salary: 0,
          difference: 0,
        }
      ),
    [reportData]
  );

  const columns = useMemo<ColumnsType<ReportRow>>(() => {
    const result: ColumnsType<ReportRow> = [
      {
        title: 'Огноо',
        dataIndex: 'dateRange',
        key: 'dateRange',
        width: 190,
      },
    ];
    if (!isCustomer) {
      result.push({
        title: effectiveType === 'driver' ? 'Жолооч' : 'Харилцагч',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 150,
        render: (name: string) => <Text strong>{name}</Text>,
      });
    }
    if (isMerchantReport) {
      result.push({
        title: 'Имэйл',
        dataIndex: 'email',
        key: 'email',
        width: 190,
        render: (email?: string) =>
          email ? email : <Text type="secondary">Имэйлгүй</Text>,
      });
    }
    result.push(
      {
        title: 'Нийт хүргэлт',
        dataIndex: 'totalDeliveries',
        key: 'totalDeliveries',
        align: 'right',
        width: 115,
      },
      {
        title: 'Хүргэсэн',
        dataIndex: 'deliveredDeliveries',
        key: 'deliveredDeliveries',
        align: 'right',
        width: 105,
      },
      {
        title: 'Буцаасан',
        dataIndex: 'status5Deliveries',
        key: 'status5Deliveries',
        align: 'right',
        width: 105,
      },
      {
        title: 'Захиалга',
        dataIndex: 'orderCount',
        key: 'orderCount',
        align: 'right',
        width: 100,
      },
      {
        title: 'Нийт тооцоо',
        dataIndex: 'totalPrice',
        key: 'totalPrice',
        align: 'right',
        width: 135,
        render: (value: number) => money(value),
      },
      {
        title: 'Тооцоо',
        dataIndex: 'salary',
        key: 'salary',
        align: 'right',
        width: 125,
        render: (value: number) => money(value),
      },
      {
        title: 'Зөрүү',
        key: 'difference',
        align: 'right',
        width: 130,
        render: (_value: unknown, row: ReportRow) => {
          const difference = row.totalPrice - row.salary;
          return (
            <Text strong type={difference < 0 ? 'danger' : 'success'}>
              {money(difference)}
            </Text>
          );
        },
      }
    );
    return result;
  }, [effectiveType, isCustomer, isMerchantReport]);

  const exportToExcel = () => {
    if (reportData.length === 0) {
      notify('warning', 'Экспортлох өгөгдөл байхгүй байна');
      return;
    }

    const rows = reportData.map((row) => ({
      Огноо: row.dateRange,
      ...(!isCustomer && {
        [effectiveType === 'driver' ? 'Жолооч' : 'Харилцагч']: row.name,
      }),
      'Нийт хүргэлт': row.totalDeliveries,
      Хүргэсэн: row.deliveredDeliveries,
      Буцаасан: row.status5Deliveries,
      Захиалга: row.orderCount,
      'Нийт тооцоо': row.totalPrice,
      Тооцоо: row.salary,
      Зөрүү: row.totalPrice - row.salary,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Тайлан');
    XLSX.writeFile(
      workbook,
      `Report_${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format(
        'YYYY-MM-DD'
      )}_${effectiveType}.xlsx`
    );
    notify('success', 'Excel файл татагдлаа');
  };

  const sendEmails = async () => {
    const selectedRows = reportData.filter(
      (row) =>
        row.merchantId && selectedMerchantIds.includes(row.merchantId)
    );
    if (selectedRows.length === 0) {
      notify('warning', 'Имэйл илгээх харилцагч сонгоно уу');
      return;
    }
    const missingEmails = selectedRows.filter((row) => !row.email?.trim());
    if (missingEmails.length > 0) {
      notify(
        'error',
        `Имэйл хаяггүй: ${missingEmails.map((row) => row.name).join(', ')}`
      );
      return;
    }
    if (
      !window.confirm(
        `${selectedRows.length} харилцагчид тайлан илгээх үү?`
      )
    ) {
      return;
    }

    setSendingEmail(true);
    try {
      const reports = selectedRows.map((row) => ({
        ...row,
        deliveries: (deliveriesByMerchantId[row.merchantId!] || []).map(
          (delivery) => ({
            id: delivery.id,
            date:
              delivery.delivered_at ||
              delivery.updatedAt ||
              delivery.createdAt,
            address: delivery.address,
            phone: delivery.phone,
            status:
              delivery.status_name?.status || String(delivery.status),
            price: Number(delivery.price || 0),
            driver: delivery.driver?.username,
          })
        ),
      }));
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/report/send-merchant-emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ reports }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Имэйл илгээхэд алдаа гарлаа');
      }
      const failed = Array.isArray(result.results)
        ? result.results.filter(
            (item: { success?: boolean }) => !item.success
          )
        : [];
      if (failed.length > 0) {
        notify('warning', result.message || 'Зарим имэйл илгээгдсэнгүй');
      } else {
        notify('success', result.message || 'Имэйл амжилттай илгээгдлээ');
        setSelectedMerchantIds([]);
      }
    } catch (error) {
      notify('error', getErrorMessage(error));
    } finally {
      setSendingEmail(false);
    }
  };

  const typeOptions = [
    { value: 'driver', label: 'Жолооч' },
    { value: 'now', label: 'Одоо тооцоо' },
    { value: 'later', label: 'Дараа тооцоо' },
    { value: 'merchant', label: 'Харилцагч' },
  ];

  const summaryValue = (key: React.Key | undefined) => {
    switch (key) {
      case 'dateRange':
        return 'Нийт';
      case 'totalDeliveries':
        return totals.totalDeliveries;
      case 'deliveredDeliveries':
        return totals.deliveredDeliveries;
      case 'status5Deliveries':
        return totals.status5Deliveries;
      case 'orderCount':
        return totals.orderCount;
      case 'totalPrice':
        return money(totals.totalPrice);
      case 'salary':
        return money(totals.salary);
      case 'difference':
        return money(totals.difference);
      default:
        return '';
    }
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Тайлан
          </Title>
          <Text type="secondary">
            Хүргэлт, буцаалт болон захиалгын нэгдсэн тооцоо
          </Text>
        </div>
        <Tag color={effectiveType === 'driver' ? 'blue' : 'purple'}>
          {typeOptions.find((item) => item.value === effectiveType)?.label}
        </Tag>
      </Flex>

      <Card size="small" style={{ marginTop: 20, marginBottom: 16 }}>
        <Space wrap size={12}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates?.[0] && dates[1]) setDateRange([dates[0], dates[1]]);
            }}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          {!isCustomer && (
            <Select
              value={reportType}
              onChange={setReportType}
              options={typeOptions}
              style={{ width: 150 }}
            />
          )}
          {!isCustomer && (
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              value={selectedId}
              onChange={(value) => setSelectedId(value ?? null)}
              placeholder={
                effectiveType === 'driver'
                  ? 'Бүх жолооч'
                  : 'Бүх харилцагч'
              }
              style={{ width: 210 }}
              options={(effectiveType === 'driver' ? drivers : merchants).map(
                (item) => ({
                  value: item.id,
                  label: item.username,
                })
              )}
            />
          )}
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={loadReportData}
          >
            Хайх
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={loading || reportData.length === 0}
            onClick={exportToExcel}
          >
            Excel татах
          </Button>
          {isMerchantReport && (
            <Button
              icon={<MailOutlined />}
              loading={sendingEmail}
              disabled={selectedMerchantIds.length === 0 || loading}
              onClick={sendEmails}
            >
              Имэйл илгээх
            </Button>
          )}
        </Space>
      </Card>

      <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <Card size="small" style={{ flex: '1 1 150px' }}>
          <Statistic title="Нийт хүргэлт" value={totals.totalDeliveries} />
        </Card>
        <Card size="small" style={{ flex: '1 1 150px' }}>
          <Statistic title="Хүргэсэн" value={totals.deliveredDeliveries} />
        </Card>
        <Card size="small" style={{ flex: '1 1 150px' }}>
          <Statistic title="Буцаасан" value={totals.status5Deliveries} />
        </Card>
        <Card size="small" style={{ flex: '1 1 190px' }}>
          <Statistic title="Нийт тооцоо" value={totals.totalPrice} suffix="₮" />
        </Card>
        <Card size="small" style={{ flex: '1 1 190px' }}>
          <Statistic
            title="Зөрүү"
            value={totals.difference}
            suffix="₮"
            valueStyle={{ color: totals.difference < 0 ? '#cf1322' : '#389e0d' }}
          />
        </Card>
      </Flex>

      {isMerchantReport && selectedMerchantIds.length > 0 && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {selectedMerchantIds.length} харилцагч сонгогдсон
        </Text>
      )}

      <Table<ReportRow>
        bordered
        size="small"
        loading={loading}
        columns={columns}
        dataSource={reportData}
        rowKey={(row) => row.merchantId ?? row.key}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Сонгосон нөхцөлд тайлан олдсонгүй' }}
        rowSelection={
          isMerchantReport
            ? {
                selectedRowKeys: selectedMerchantIds,
                onChange: (keys) =>
                  setSelectedMerchantIds(keys.map((key) => Number(key))),
                getCheckboxProps: (row) => ({
                  disabled: !row.merchantId,
                }),
              }
            : undefined
        }
        summary={() =>
          reportData.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row
                style={{ background: '#fafafa', fontWeight: 700 }}
              >
                {isMerchantReport && <Table.Summary.Cell index={0} />}
                {columns.map((column, index) => (
                  <Table.Summary.Cell
                    key={String(column.key)}
                    index={index + (isMerchantReport ? 1 : 0)}
                    align={column.align}
                  >
                    {summaryValue(column.key)}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />

    </div>
  );
}
