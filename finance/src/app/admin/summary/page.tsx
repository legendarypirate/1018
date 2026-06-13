'use client';

import React, { useState, useEffect } from 'react';
import { Table, Select, DatePicker, Card, Statistic, Row, Col, Typography, Alert, Button, Space } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// Status interface
interface StatusType {
  id: number;
  status: string;
  color: string;
}

// Goods report data structure
interface GoodsReport {
  goodsName: string;
  totalNumber: number;
  statusCounts: { [statusId: number]: number };
  totalDeliveries: number;
}

// Driver report data structure
interface DriverGoodsReport {
  driverId: number;
  driverName: string;
  goods: GoodsReport[];
  statuses: StatusType[];
}

type OptionType = {
  id: string;
  username: string;
};

export default function DriverReportPage() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverOptions, setDriverOptions] = useState<OptionType[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<DriverGoodsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get user data from localStorage
  const [userRole, setUserRole] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Initialize user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Жолоочийн барааны тайлан';
      const userData = localStorage.getItem('user');
      const role = localStorage.getItem('role');
      
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
        setUserId(user.id.toString());
        setUsername(user.username);
        
        // If user is driver (role 3), automatically set driver ID
        if (user.role === 3) {
          setSelectedDriverId(user.id.toString());
        }
      } else if (role) {
        setUserRole(parseInt(role));
      }
    }
  }, []);

  // Fetch driver options
  useEffect(() => {
    if (userRole === 3) {
      // Skip fetching if user is a driver
      return;
    }

    const fetchDrivers = async () => {
      setLoadingOptions(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/drivers`);
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
  }, [userRole]);

  // Fetch driver goods report using new backend endpoint
  const fetchDriverReport = async (driverId: string, startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const query = new URLSearchParams({
        driver_id: driverId,
        start_date: startDate,
        end_date: endDate,
      }).toString();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/report/driver-goods?${query}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch driver goods report.');
      }

      setReportData(result.data);
    } catch (error: any) {
      setError(`Алдаа: ${error.message || error}`);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(dates ?? [null, null]);
    if (dates && dates[0] && dates[1] && selectedDriverId) {
      fetchDriverReport(
        selectedDriverId,
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD')
      );
    } else {
      setReportData(null);
    }
  };

  // Handle driver selection change
  const handleDriverChange = (value: string | null) => {
    setSelectedDriverId(value);
    if (value && dateRange[0] && dateRange[1]) {
      fetchDriverReport(
        value,
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
    } else {
      setReportData(null);
    }
  };

  // Build table columns dynamically based on statuses
  const buildTableColumns = (statuses: StatusType[]): ColumnsType<GoodsReport> => {
    const columns: ColumnsType<GoodsReport> = [
      {
        title: 'Барааны нэр',
        dataIndex: 'goodsName',
        key: 'goodsName',
        fixed: 'left',
        width: 200,
      },
      {
        title: 'Нийт тоо',
        dataIndex: 'totalNumber',
        key: 'totalNumber',
        width: 120,
        render: (value: number) => value.toLocaleString(),
      },
    ];

    // Add a column for each status
    statuses.forEach((status) => {
      columns.push({
        title: status.status,
        key: `status_${status.id}`,
        width: 120,
        render: (_: any, record: GoodsReport) => {
          const count = record.statusCounts[status.id] || 0;
          return (
            <span style={{ 
              color: getStatusColor(status.color), 
              fontWeight: 'bold' 
            }}>
              {count}
            </span>
          );
        },
      });
    });

    columns.push({
      title: 'Нийт хүргэлт',
      dataIndex: 'totalDeliveries',
      key: 'totalDeliveries',
      width: 120,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold' }}>{value}</span>
      ),
    });

    return columns;
  };

  // Helper function to convert color names to hex codes
  const getStatusColor = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'orange': '#fa8c16',
      'blue': '#1890ff',
      'green': '#52c41a',
      'red': '#ff4d4f',
      'brown': '#8b4513',
      'purple': '#722ed1',
      'cyan': '#13c2c2',
      'teal': '#20b2aa',
      'violet': '#8b5cf6',
    };
    return colorMap[colorName] || '#000000';
  };

  // Calculate totals
  const calculateTotals = (goods: GoodsReport[], statuses: StatusType[]) => {
    const totals = {
      totalNumber: 0,
      totalDeliveries: 0,
      statusTotals: {} as { [statusId: number]: number },
    };

    // Initialize status totals
    statuses.forEach((s) => {
      totals.statusTotals[s.id] = 0;
    });

    goods.forEach((item) => {
      totals.totalNumber += item.totalNumber;
      totals.totalDeliveries += item.totalDeliveries;
      statuses.forEach((s) => {
        totals.statusTotals[s.id] += item.statusCounts[s.id] || 0;
      });
    });

    return totals;
  };

  // Check if filters are ready
  const hasFilters = selectedDriverId && dateRange[0] && dateRange[1];
  const showFilters = userRole !== 3 || (userRole === 3 && selectedDriverId);

  const handlePrint = () => {
    if (!reportData) return;
    window.print();
  };

  const dateRangeLabel =
    dateRange[0] && dateRange[1]
      ? `${dateRange[0].format('YYYY-MM-DD')} — ${dateRange[1].format('YYYY-MM-DD')}`
      : '';

  return (
    <div className="summary-print-root" style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <style>{`
        @media print {
          .summary-no-print {
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
          .summary-print-root {
            padding: 0 !important;
            min-height: auto !important;
            background: #fff !important;
          }
          .summary-print-area .ant-card {
            box-shadow: none !important;
            border: 1px solid #d9d9d9 !important;
            break-inside: avoid;
          }
          .summary-print-area .ant-table-wrapper,
          .summary-print-area .ant-table-content,
          .summary-print-area .ant-table-body {
            overflow: visible !important;
          }
          .summary-print-area .ant-table {
            font-size: 11px;
          }
          .summary-print-area .ant-table-thead > tr > th,
          .summary-print-area .ant-table-tbody > tr > td,
          .summary-print-area .ant-table-summary > tr > td {
            padding: 4px 8px !important;
            white-space: nowrap;
          }
          .summary-print-only {
            display: block !important;
          }
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
        }
        .summary-print-only {
          display: none;
        }
      `}</style>

      {/* Page Title and Info */}
      <Card className="summary-no-print" style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>
          Жолоочийн барааны тайлан
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Энэ хуудас нь жолоочийн хүргэлтийн барааны тоо, төлөвийн дагуух тайланг харуулна. 
          Огнооны шүүлт нь хүргэлт үүссэн огноо (createdAt) дээр суурилна.
        </Text>
      </Card>

      {/* Filters - Only show if driver is selected or user is not a driver */}
      {showFilters && (
        <Card className="summary-no-print" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Driver Selector - Hide for driver users */}
            {userRole !== 3 ? (
              <Select
                value={selectedDriverId}
                onChange={handleDriverChange}
                placeholder="Жолооч сонгох"
                style={{ width: 200 }}
                loading={loadingOptions}
                allowClear
                options={driverOptions.map((o) => ({ label: o.username, value: o.id }))}
              />
            ) : (
              <div style={{ 
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                backgroundColor: '#f5f5f5',
                minWidth: '200px'
              }}>
                <div style={{ fontWeight: 'bold' }}>Жолооч:</div>
                <div>{username || 'Loading...'}</div>
              </div>
            )}

            {selectedDriverId && (
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                placeholder={['Эхлэх огноо', 'Дуусах огноо']}
              />
            )}
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert
          className="summary-no-print"
          message="Алдаа"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
          onClose={() => setError(null)}
        />
      )}

      {/* Report Data */}
      {reportData && hasFilters && (
        <div className="summary-print-area" style={{ marginBottom: '24px' }}>
          <div className="summary-print-only" style={{ marginBottom: 16 }}>
            <Title level={3} style={{ marginBottom: 8 }}>
              Жолоочийн барааны тайлан
            </Title>
            <Text>Жолооч: {reportData.driverName}</Text>
            <br />
            <Text>Хугацаа: {dateRangeLabel}</Text>
            <br />
            <Text>Хэвлэсэн: {dayjs().format('YYYY-MM-DD HH:mm')}</Text>
          </div>

          <div className="summary-no-print" style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
              Хэвлэх
            </Button>
          </div>

          {/* Driver Summary Cards */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Нийт барааны тоо"
                  value={calculateTotals(reportData.goods, reportData.statuses).totalNumber}
                  precision={0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Нийт хүргэлт"
                  value={calculateTotals(reportData.goods, reportData.statuses).totalDeliveries}
                  precision={0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Goods Table */}
          <Card
            title={`${reportData.driverName} - Барааны тайлан (${dateRangeLabel})`}
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={buildTableColumns(reportData.statuses)}
              dataSource={reportData.goods}
              loading={loading}
              rowKey="goodsName"
              pagination={false}
              scroll={{ x: 'max-content' }}
              className="summary-report-table"
              summary={() => {
                const totals = calculateTotals(reportData.goods, reportData.statuses);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>Нийт</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {totals.totalNumber.toLocaleString()}
                      </Table.Summary.Cell>
                      {reportData.statuses.map((status, idx) => (
                        <Table.Summary.Cell key={status.id} index={idx + 2}>
                          <span style={{ color: getStatusColor(status.color) }}>
                            {totals.statusTotals[status.id] || 0}
                          </span>
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={reportData.statuses.length + 2}>
                        {totals.totalDeliveries}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !reportData && hasFilters && !error && (
        <Card className="summary-no-print">
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Сонгосон хугацаанд мэдээлэл олдсонгүй
          </div>
        </Card>
      )}

      {/* Initial State - Show info when filters are not set */}
      {!hasFilters && !loading && (
        <Card className="summary-no-print">
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {userRole === 3 
              ? 'Огноо сонгоно уу'
              : 'Жолооч болон огноо сонгоно уу'}
          </div>
        </Card>
      )}
    </div>
  );
}
