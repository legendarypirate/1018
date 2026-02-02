'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Select, DatePicker, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

// ---- Delivery interface ----
interface Delivery {
  id: number;
  phone: string;
  address: string;
  status: number | string;
  price: number;
  comment: string;
  driver: { username: string };
  createdAt: string;
  merchant: { username: string };
  status_name: {
    status: string;
    color: string;
  };
  delivered_at?: string;
}

// ---- Report Row interface ----
interface ReportRow {
  key: string;
  dateRange: string;
  driverName: string;
  totalDeliveries: number;
  totalPrice: number;
  salary: number;
  difference: number;
}

// Report Table Columns
const reportColumns: ColumnsType<ReportRow> = [
  {
    title: 'Огноо',
    dataIndex: 'dateRange',
    key: 'dateRange',
  },
  {
    title: 'Жолооч',
    dataIndex: 'driverName',
    key: 'driverName',
  },
  {
    title: 'Нийт хүргэлт',
    dataIndex: 'totalDeliveries',
    key: 'totalDeliveries',
    render: (value: number) => value.toLocaleString(),
  },
  {
    title: 'Нийт тооцоо',
    dataIndex: 'totalPrice',
    key: 'totalPrice',
    render: (value: number) => value.toLocaleString() + ' ₮',
  },
  {
    title: 'Цалин',
    dataIndex: 'salary',
    key: 'salary',
    render: (value: number) => value.toLocaleString() + ' ₮',
  },
  {
    title: 'Зөрүү',
    dataIndex: 'difference',
    key: 'difference',
    render: (value: number) => value.toLocaleString() + ' ₮',
  },
];

type OptionType = {
  id: string;
  username: string;
};

export default function DeliveryPage() {
  // Report states
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters states
  const [driverOptions, setDriverOptions] = useState<OptionType[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const openNotification = (type: 'success' | 'error', messageText: string) => {
    notification.open({
      message: null,
      description: <div style={{ color: 'white' }}>{messageText}</div>,
      duration: 4,
      showProgress: true,
      style: {
        backgroundColor: type === 'success' ? '#52c41a' : '#ff4d4f',
        borderRadius: '4px',
      },
      closeIcon: <CloseOutlined style={{ color: '#fff' }} />,
    });
  };

  // Fetch drivers on mount
  useEffect(() => {
    document.title = 'Тайлан харах';

    const fetchDrivers = async () => {
      setLoadingOptions(true);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/user/drivers`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setDriverOptions(result.data);
        } else {
          setDriverOptions([]);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setDriverOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchDrivers();
  }, []);

  // Load report data
  const loadReportData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      openNotification('error', 'Огноо сонгоно уу');
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Fetch all deliveries with status 3 (delivered) filtered by delivered_at
      // Use findAllWithDate which filters by delivered_at and status 3
      let deliveryUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/delivery/findAllWithDate?page=1&limit=10000&startDate=${startDate}&endDate=${endDate}`;
      
      if (selectedDriverId) {
        deliveryUrl += `&driverId=${selectedDriverId}`;
      }

      const deliveryRes = await fetch(deliveryUrl);
      if (!deliveryRes.ok) throw new Error(`Delivery API error: ${deliveryRes.status}`);

      const deliveryData = await deliveryRes.json();

      if (!deliveryData.success || !Array.isArray(deliveryData.data)) {
        throw new Error('Invalid delivery data format');
      }

      // Filter only status 3 deliveries
      const status3Deliveries = deliveryData.data.filter(
        (d: Delivery) => d.status === 3 || d.status === '3'
      );

      // Group deliveries by driver
      const groupedByDriver: Record<string, Delivery[]> = {};
      status3Deliveries.forEach((delivery: Delivery) => {
        const driverName = delivery.driver?.username || 'No Driver';
        if (!groupedByDriver[driverName]) {
          groupedByDriver[driverName] = [];
        }
        groupedByDriver[driverName].push(delivery);
      });

      // Calculate report rows
      const reportRows: ReportRow[] = Object.entries(groupedByDriver).map(
        ([driverName, deliveries]) => {
          const totalDeliveries = deliveries.length;
          const totalPrice = deliveries.reduce(
            (sum, d) => sum + parseFloat(d.price.toString()),
            0
          );
          // Salary is 7k per delivery
          const salary = totalDeliveries * 7000;
          const difference = totalPrice - salary;

          return {
            key: driverName,
            dateRange: `${startDate} ~ ${endDate}`,
            driverName,
            totalDeliveries,
            totalPrice,
            salary,
            difference,
          };
        }
      );

      setReportData(reportRows);
    } catch (error: any) {
      console.error('Error loading report data:', error);
      setFetchError(error.message || 'Failed to load report data');
      openNotification('error', `Алдаа гарлаа: ${error.message || 'Unknown error'}`);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Excel export function
  const exportToExcel = () => {
    if (reportData.length === 0) {
      openNotification('error', 'Экспортлох өгөгдөл байхгүй байна');
      return;
    }

    try {
      // Calculate totals
      const totals = reportData.reduce(
        (acc, row) => {
          acc.totalDeliveries += row.totalDeliveries;
          acc.totalPrice += row.totalPrice;
          acc.salary += row.salary;
          acc.difference += row.difference;
          return acc;
        },
        {
          totalDeliveries: 0,
          totalPrice: 0,
          salary: 0,
          difference: 0,
        }
      );

      // Prepare data for Excel
      const headers = ['Огноо', 'Жолооч', 'Нийт хүргэлт', 'Нийт тооцоо', 'Цалин', 'Зөрүү'];
      const excelData = [
        headers,
        ...reportData.map((row) => [
          row.dateRange,
          row.driverName,
          row.totalDeliveries,
          row.totalPrice,
          row.salary,
          row.difference,
        ]),
        ['Нийт', '', totals.totalDeliveries, totals.totalPrice, totals.salary, totals.difference],
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Огноо
        { wch: 20 }, // Жолооч
        { wch: 15 }, // Нийт хүргэлт
        { wch: 15 }, // Нийт тооцоо
        { wch: 15 }, // Цалин
        { wch: 15 }, // Зөрүү
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      // Generate filename with date range
      const startDate = dateRange[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange[1]?.format('YYYY-MM-DD') || '';
      const filename = `Report_${startDate}_${endDate}_driver.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      openNotification('success', 'Excel файл амжилттай экспортлогдлоо');
    } catch (error) {
      console.error('Excel export error:', error);
      openNotification('error', 'Excel файл экспортлоход алдаа гарлаа');
    }
  };

  // Calculate totals
  const totals = reportData.reduce(
    (acc, row) => {
      acc.totalDeliveries += row.totalDeliveries;
      acc.totalPrice += row.totalPrice;
      acc.salary += row.salary;
      acc.difference += row.difference;
      return acc;
    },
    {
      totalDeliveries: 0,
      totalPrice: 0,
      salary: 0,
      difference: 0,
    }
  );

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Тайлан</h1>

      {/* Filters Row */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates ?? [null, null]);
          }}
          format="YYYY-MM-DD"
          style={{ width: 300 }}
        />

        <Select
          value={selectedDriverId}
          onChange={(value) => {
            setSelectedDriverId(value);
          }}
          placeholder="Бүх жолооч"
          style={{ width: 200 }}
          loading={loadingOptions}
          allowClear
          options={driverOptions.map((o) => ({ label: o.username, value: o.id }))}
        />

        <Button type="primary" onClick={loadReportData} loading={loading}>
          Хайх
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={exportToExcel}
          disabled={reportData.length === 0}
        >
          Excel татах
        </Button>

        {fetchError && (
          <div style={{ color: 'red', marginLeft: '16px' }}>{fetchError}</div>
        )}
      </div>

      {/* Report Table */}
      <div style={{ background: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <Table
          columns={reportColumns}
          dataSource={reportData}
          loading={loading}
          rowKey="key"
          pagination={false}
          locale={{ emptyText: 'Тайлан байхгүй байна' }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0}>Нийт</Table.Summary.Cell>
                <Table.Summary.Cell index={1}></Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  {totals.totalDeliveries.toLocaleString()}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  {totals.totalPrice.toLocaleString()} ₮
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  {totals.salary.toLocaleString()} ₮
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  {totals.difference.toLocaleString()} ₮
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    </div>
  );
}