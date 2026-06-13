'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Select,
  DatePicker,
  notification,
  Drawer,
  Typography,
  Space,
  Radio,
  Tag,
} from 'antd';
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
  driver_comment?: string;
  driver: { username: string };
  createdAt: string;
  updatedAt: string;
  merchant: { username: string };
  status_name?: {
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

type ReportType = 'delivered' | 'cancelled' | 'returned';

const SALARY_PER_DELIVERY = 7000;

const REPORT_OPTIONS: { key: ReportType; label: string; statusIds: string }[] = [
  { key: 'delivered', label: 'Хүргэгдсэн', statusIds: '3' },
  { key: 'cancelled', label: 'Цуцалсан', statusIds: '4' },
  { key: 'returned', label: 'Буцаасан', statusIds: '5' },
];

const STATUS_FALLBACK: Record<number, { label: string; color: string }> = {
  3: { label: 'Хүргэгдсэн', color: 'green' },
  4: { label: 'Цуцалсан', color: 'red' },
  5: { label: 'Буцаасан', color: 'orange' },
};

const getStatusMeta = (record: Delivery) => {
  const statusId = Number(record.status);
  const fallback = STATUS_FALLBACK[statusId];
  return {
    label: record.status_name?.status || fallback?.label || String(record.status),
    color: record.status_name?.color || fallback?.color || 'default',
  };
};

const StatusBadge = ({ record }: { record: Delivery }) => {
  const { label, color } = getStatusMeta(record);
  return <Tag color={color}>{label}</Tag>;
};

const buildSummaryColumns = (showSalary: boolean): ColumnsType<ReportRow> => {
  const columns: ColumnsType<ReportRow> = [
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
  ];

  if (showSalary) {
    columns.push(
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
      }
    );
  }

  return columns;
};

const buildDetailColumns = (): ColumnsType<Delivery> => {
  return [
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
      width: 130,
      render: (_: unknown, record: Delivery) => <StatusBadge record={record} />,
    },
    {
      title: 'Огноо',
      key: 'date',
      width: 150,
      render: (_: unknown, record: Delivery) => {
        const value =
          Number(record.status) === 3
            ? record.delivered_at
            : record.updatedAt;
        return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—';
      },
    },
    {
      title: 'Тайлбар',
      key: 'comment',
      ellipsis: true,
      render: (_: unknown, record: Delivery) =>
        record.driver_comment || record.comment || '—',
    },
  ];
};

export default function DeliveryPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('delivered');
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [driverDeliveriesMap, setDriverDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [driverOptions, setDriverOptions] = useState<OptionType[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedReportRow, setSelectedReportRow] = useState<ReportRow | null>(null);

  const activeReport = REPORT_OPTIONS.find((opt) => opt.key === reportType)!;
  const showSalary = reportType === 'delivered';

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
    setDetailDrawerOpen(false);
    setSelectedReportRow(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      let deliveryUrl =
        `${process.env.NEXT_PUBLIC_API_URL}/api/delivery/findAllWithDate` +
        `?page=1&limit=10000&startDate=${startDate}&endDate=${endDate}` +
        `&statusIds=${activeReport.statusIds}`;

      if (selectedDriverId) {
        deliveryUrl += `&driverId=${selectedDriverId}`;
      }

      const deliveryRes = await fetch(deliveryUrl);
      if (!deliveryRes.ok) throw new Error(`Delivery API error: ${deliveryRes.status}`);

      const deliveryData = await deliveryRes.json();

      if (!deliveryData.success || !Array.isArray(deliveryData.data)) {
        throw new Error('Invalid delivery data format');
      }

      const filteredDeliveries = deliveryData.data.filter((d: Delivery) => {
        const statusId = Number(d.status);
        if (reportType === 'delivered') return statusId === 3;
        if (reportType === 'cancelled') return statusId === 4;
        return statusId === 5;
      });

      const groupedByDriver: Record<string, Delivery[]> = {};
      filteredDeliveries.forEach((delivery: Delivery) => {
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
          const salary = showSalary ? totalDeliveries * SALARY_PER_DELIVERY : 0;
          const difference = showSalary ? totalPrice - salary : 0;

          return {
            key: `${reportType}-${driverName}`,
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

  const handleReportTypeChange = (value: ReportType) => {
    setReportType(value);
    setReportData([]);
    setDriverDeliveriesMap({});
    setDetailDrawerOpen(false);
    setSelectedReportRow(null);
  };

  const handleRowClick = (record: ReportRow) => {
    setSelectedReportRow(record);
    setDetailDrawerOpen(true);
  };

  const handlePrintDetail = () => {
    window.print();
  };

  const detailDeliveries = useMemo(() => {
    if (!selectedReportRow) return [];
    return driverDeliveriesMap[selectedReportRow.driverName] || [];
  }, [selectedReportRow, driverDeliveriesMap]);

  const summaryColumns = useMemo(
    () => buildSummaryColumns(showSalary),
    [showSalary]
  );

  const detailColumns = useMemo(() => buildDetailColumns(), []);

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

      const headers = showSalary
        ? ['Огноо', 'Жолооч', 'Нийт хүргэлт', 'Нийт тооцоо', 'Цалин', 'Зөрүү']
        : ['Огноо', 'Жолооч', 'Нийт', 'Нийт тооцоо'];

      const excelData = [
        headers,
        ...reportData.map((row) =>
          showSalary
            ? [
                row.dateRange,
                row.driverName,
                row.totalDeliveries,
                row.totalPrice,
                row.salary,
                row.difference,
              ]
            : [row.dateRange, row.driverName, row.totalDeliveries, row.totalPrice]
        ),
        showSalary
          ? ['Нийт', '', excelTotals.totalDeliveries, excelTotals.totalPrice, excelTotals.salary, excelTotals.difference]
          : ['Нийт', '', excelTotals.totalDeliveries, excelTotals.totalPrice],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, activeReport.label);

      const startDate = dateRange[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange[1]?.format('YYYY-MM-DD') || '';
      const filename = `Report_${activeReport.label}_${startDate}_${endDate}.xlsx`;

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
          .report-detail-drawer .ant-drawer-mask {
            display: none !important;
          }
          .report-detail-drawer {
            position: static !important;
          }
          .report-detail-drawer .ant-drawer-content-wrapper {
            position: static !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          .report-detail-drawer .ant-drawer-content {
            box-shadow: none !important;
          }
          .report-detail-drawer .ant-drawer-header,
          .report-detail-drawer .report-drawer-actions {
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
          .report-detail-print-area .ant-tag {
            border: 1px solid #d9d9d9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
        <Radio.Group
          value={reportType}
          onChange={(e) => handleReportTypeChange(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={REPORT_OPTIONS.map((opt) => ({
            label: opt.label,
            value: opt.key,
          }))}
        />

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
          Жолоочийн мөр дээр дарж дэлгэрэнгүй жагсаалт харах, хэвлэх
        </Text>
      )}

      <div style={{ background: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <Table
          className="report-no-print"
          columns={summaryColumns}
          dataSource={reportData}
          loading={loading}
          rowKey="key"
          pagination={false}
          locale={{ emptyText: `${activeReport.label} тайлан байхгүй байна` }}
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
                {showSalary && (
                  <>
                    <Table.Summary.Cell index={4}>
                      {totals.salary.toLocaleString()} ₮
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      {totals.difference.toLocaleString()} ₮
                    </Table.Summary.Cell>
                  </>
                )}
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>

      <Drawer
        className="report-detail-drawer"
        title={
          selectedReportRow
            ? `${selectedReportRow.driverName} — ${activeReport.label} (${selectedReportRow.totalDeliveries})`
            : 'Дэлгэрэнгүй хүргэлт'
        }
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedReportRow(null);
        }}
        width="88%"
        destroyOnClose
        styles={{ body: { paddingBottom: 24 } }}
      >
        {selectedReportRow && (
          <div className="report-detail-print-area">
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4}>
                <Text><strong>Төлөв:</strong> {activeReport.label}</Text>
                <Text><strong>Жолооч:</strong> {selectedReportRow.driverName}</Text>
                <Text><strong>Хугацаа:</strong> {selectedReportRow.dateRange}</Text>
                <Text>
                  <strong>Нийт:</strong> {selectedReportRow.totalDeliveries.toLocaleString()}
                  {' · '}
                  <strong>Нийт тооцоо:</strong> {selectedReportRow.totalPrice.toLocaleString()} ₮
                  {showSalary && (
                    <>
                      {' · '}
                      <strong>Цалин:</strong> {selectedReportRow.salary.toLocaleString()} ₮
                      {' · '}
                      <strong>Зөрүү:</strong> {selectedReportRow.difference.toLocaleString()} ₮
                    </>
                  )}
                </Text>
                <StatusBadge
                  record={{
                    status: activeReport.statusIds,
                    status_name: {
                      status: activeReport.label,
                      color: STATUS_FALLBACK[Number(activeReport.statusIds)]?.color || 'default',
                    },
                  } as Delivery}
                />
                <Text type="secondary">Хэвлэсэн: {dayjs().format('YYYY-MM-DD HH:mm')}</Text>
              </Space>
            </div>

            <div className="report-drawer-actions" style={{ marginBottom: 16, textAlign: 'right' }}>
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
              scroll={{ x: 'max-content' }}
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
      </Drawer>
    </div>
  );
}
