import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const ParentDashboard = () => {
  const lineChartData = [
    { name: 'HK1', score: 7.5 },
    { name: 'HK2', score: 6.3 },
    { name: 'Cả năm', score: 6.9 },
  ];

  const barChartData = [
    { subject: 'Toán', avg: 7.2 },
    { subject: 'Văn', avg: 6.8 },
    { subject: 'Anh', avg: 8.1 },
  ];

  const pieChartData = [
    { name: 'Có mặt', value: 80 },
    { name: 'Vắng', value: 15 },
    { name: 'Muộn', value: 5 },
  ];

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="container mt-4">
        <h2 className="text-center text-light">Dashboard</h2>
        <Tabs defaultActiveKey="overview" id="dashboard-tabs" className="mb-3">
          <Tab eventKey="overview" title="Tổng quan">
            <div className="card bg-dark text-light p-3">
              <h5>Thông tin học sinh</h5>
              <p>Họ tên: Nguyễn Văn A</p>
              <p>Lớp: 10A1</p>
              <p>Trung bình hiện tại: 7.5</p>
              <p>Xếp loại: Khá</p>
            </div>
          </Tab>
          <Tab eventKey="scoreChart" title="Biểu đồ điểm">
            <div className="row">
              <div className="col-md-6">
                <h5>Trend điểm trung bình</h5>
                <LineChart width={400} height={300} data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" />
                </LineChart>
              </div>
              <div className="col-md-6">
                <h5>Trung bình từng môn</h5>
                <BarChart width={400} height={300} data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" fill="#82ca9d" />
                </BarChart>
              </div>
            </div>
          </Tab>
          <Tab eventKey="attendanceChart" title="Biểu đồ điểm danh">
            <h5>Biểu đồ điểm danh</h5>
            <PieChart width={400} height={300}>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </Tab>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default ParentDashboard;
