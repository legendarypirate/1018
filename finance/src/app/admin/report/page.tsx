'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Select, DatePicker, notification, Modal, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { CloseOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Text } = Typography;

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

interface ReportRow {
  key: string;
  dateRange: string;
  driverName: string;
  totalDeliveries: number;
  totalPrice: number;
  salary: number;
  difference: number;
}

type OptionType = {
  id: string;
  username: string;
};

const SALARY_PER_DELIVERY = 7000;

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
    render: (name: string) => (
      <span style={{ color: '#1677ff', fontWeight: 500 }}>{name}</span>
    ),
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

const detailColumns: ColumnsType<Delivery> = [
  {
    title: '№',
    key: 'index',
    width: 50,
    render: (_: unknown, __: Delivery, index: number) => index + 1,
  },
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 70,
  },
  {
    title: 'Харилцагч',
    key: 'merchant',
    width: 140,
    render: (_: unknown, record: Delivery) => record.merchant?.username || '—',
  },
  {
    title: 'Утас',
    dataIndex: 'phone',
    key: 'phone',
    width: 110,
  },
  {
    title: 'Хаяг',
    dataIndex: 'address',
    key: 'address',
    ellipsis: true,
  },
  {
    title: 'Үнэ',
    dataIndex: 'price',
    key: 'price',
    width: 100,
    render: (value: number) => Number(value).toLocaleString() + ' ₮',
  },
  {
    title: 'Төлөв',
    key: 'status',
    width: 120,
    render: (_: unknown, record: Delivery) => record.status_name?.status || record.status,
  },
  {
    title: 'Хүргэсэн огноо',
    dataIndex: 'delivered_at',
    key: 'delivered_at',
    width: 150,
    render: (value?: string) =>
      value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—',
  },
  {
    title: 'Тайлбар',
    dataIndex: 'comment',
    key: 'comment',
    ellipsis: true,
    render: (value: string) => value || '—',
  },
];

export default function DeliveryPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [driverDeliveriesMap, setDriverDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [driverOptions, setDriverOptions] = useState<OptionType[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReportRow, setSelectedReportRow] = useState<ReportRow | null>(null);

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

  const loadReportData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      openNotification('error', 'Огноо сонгоно уу');
      return;
    }

    setLoading(true);
    setFetchError(null);
    setDetailModalOpen(false);
    setSelectedReportRow(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

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

      const status3Deliveries = deliveryData.data.filter(
        (d: Delivery) => d.status === 3 || d.status === '3'
      );

      const groupedByDriver: Record<string, Delivery[]> = {};
      status3Deliveries.forEach((delivery: Delivery) => {
        const driverName = delivery.driver?.username || 'No Driver';
        if (!groupedByDriver[driverName]) {
          groupedByDriver[driverName] = [];
        }
        groupedByDriver[driverName].push(delivery);
      });

      const reportRows: ReportRow[] = Object.entries(groupedByDriver)
        .map(([driverName, deliveries]) => {
          const totalDeliveries = deliveries.length;
          const totalPrice = deliveries.reduce(
            (sum, d) => sum + parseFloat(d.price.toString()),
            0
          );
          const salary = totalDeliveries * SALARY_PER_DELIVERY;
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
        })
        .sort((a, b) => a.driverName.localeCompare(b.driverName));

      setDriverDeliveriesMap(groupedByDriver);
      setReportData(reportRows);
    } catch (error: any) {
      console.error('Error loading report data:', error);
      setFetchError(error.message || 'Failed to load report data');
      openNotification('error', `Алдаа гарлаа: ${error.message || 'Unknown error'}`);
      setReportData([]);
      setDriverDeliveriesMap({});
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (record: ReportRow) => {
    setSelectedReportRow(record);
    setDetailModalOpen(true);
  };

  const handlePrintDetail = () => {
    window.print();
  };

  const detailDeliveries = useMemo(() => {
    if (!selectedReportRow) return [];
    return driverDeliveriesMap[selectedReportRow.driverName] || [];
  }, [selectedReportRow, driverDeliveriesMap]);

  const exportToExcel = () => {
    if (reportData.length === 0) {
      openNotification('error', 'Экспортлох өгөгдөл байхгүй байна');
      return;
    }

    try {
      const excelTotals = reportData.reduce(
        (acc, row) => {
          acc.totalDeliveries += row.totalDeliveries;
          acc.totalPrice += row.totalPrice;
          acc.salary += row.salary;
          acc.difference += row.difference;
          return acc;
        },
        { totalDeliveries: 0, totalPrice: 0, salary: 0, difference: 0 }
      );

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
        ['Нийт', '', excelTotals.totalDeliveries, excelTotals.totalPrice, excelTotals.salary, excelTotals.difference],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      const startDate = dateRange[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange[1]?.format('YYYY-MM-DD') || '';
      const filename = `Report_${startDate}_${endDate}_driver.xlsx`;

      XLSX.writeFile(wb, filename);
      openNotification('success', 'Excel файл амжилттай экспортлогдлоо');
    } catch (error) {
      console.error('Excel export error:', error);
      openNotification('error', 'Excel файл экспортлоход алдаа гарлаа');
    }
  };

  const totals = reportData.reduce(
    (acc, row) => {
      acc.totalDeliveries += row.totalDeliveries;
      acc.totalPrice += row.totalPrice;
      acc.salary += row.salary;
      acc.difference += row.difference;
      return acc;
    },
    { totalDeliveries: 0, totalPrice: 0, salary: 0, difference: 0 }
  );

  return (
    <div className="report-print-root" style={{ padding: '24px' }}>
      <style>{`
        @media print {
          .report-no-print {
            display: none !important;
          }
          .ant-layout-sider,
          .ant-layout-header {
            display: none !important;
          }
          .ant-layout,
          .ant-layout-content {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .report-print-root {
            padding: 0 !important;
            background: #fff !important;
          }
          .report-detail-modal .ant-modal-mask {
            display: none !important;
          }
          .report-detail-modal {
            position: static !important;
            overflow: visible !important;
          }
          .report-detail-modal .ant-modal-wrap {
            position: static !important;
            overflow: visible !important;
          }
          .report-detail-modal .ant-modal {
            position: static !important;
            top: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .report-detail-modal .ant-modal-content {
            box-shadow: none !important;
          }
          .report-detail-modal .ant-modal-close,
          .report-detail-modal .report-modal-actions {
            display: none !important;
          }
          .report-detail-print-area .ant-table-wrapper,
          .report-detail-print-area .ant-table-content,
          .report-detail-print-area .ant-table-body {
            overflow: visible !important;
          }
          .report-detail-print-area .ant-table {
            font-size: 10px;
          }
          .report-detail-print-area .ant-table-thead > tr > th,
          .report-detail-print-area .ant-table-tbody > tr > td {
            padding: 3px 6px !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <h1 className="report-no-print" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Тайлан
      </h1>

      <div
        className="report-no-print"
        style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates ?? [null, null])}
          format="YYYY-MM-DD"
          style={{ width: 300 }}
        />

        <Select
          value={selectedDriverId}
          onChange={(value) => setSelectedDriverId(value)}
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

        {fetchError && <div style={{ color: 'red', marginLeft: '16px' }}>{fetchError}</div>}
      </div>

      {reportData.length > 0 && (
        <Text type="secondary" className="report-no-print" style={{ display: 'block', marginBottom: 12 }}>
          Жолоочийн мөр дээр дарж дэлгэрэнгүй хүргэлтийн жагсаалт харах
        </Text>
      )}

      <div style={{ background: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <Table
          className="report-no-print"
          columns={reportColumns}
          dataSource={reportData}
          loading={loading}
          rowKey="key"
          pagination={false}
          locale={{ emptyText: 'Тайлан байхгүй байна' }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
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

      <Modal
        className="report-detail-modal"
        title={
          selectedReportRow
            ? `${selectedReportRow.driverName} — дэлгэрэнгүй хүргэлт`
            : 'Дэлгэрэнгүй хүргэлт'
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedReportRow(null);
        }}
        width={1200}
        footer={null}
        destroyOnClose
      >
        {selectedReportRow && (
          <div className="report-detail-print-area">
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={2}>
                <Text><strong>Жолооч:</strong> {selectedReportRow.driverName}</Text>
                <Text><strong>Хугацаа:</strong> {selectedReportRow.dateRange}</Text>
                <Text>
                  <strong>Нийт хүргэлт:</strong> {selectedReportRow.totalDeliveries.toLocaleString()}
                  {' · '}
                  <strong>Нийт тооцоо:</strong> {selectedReportRow.totalPrice.toLocaleString()} ₮
                  {' · '}
                  <strong>Цалин:</strong> {selectedReportRow.salary.toLocaleString()} ₮
                  {' · '}
                  <strong>Зөрүү:</strong> {selectedReportRow.difference.toLocaleString()} ₮
                </Text>
                <Text type="secondary">Хэвлэсэн: {dayjs().format('YYYY-MM-DD HH:mm')}</Text>
              </Space>
            </div>

            <div className="report-modal-actions" style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrintDetail}>
                Хэвлэх
              </Button>
            </div>

            <Table
              columns={detailColumns}
              dataSource={detailDeliveries}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content', y: 480 }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      Нийт
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      {detailDeliveries
                        .reduce((sum, d) => sum + Number(d.price), 0)
                        .toLocaleString()}{' '}
                      ₮
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} colSpan={3}>
                      {detailDeliveries.length} хүргэлт
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
