import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import { motion } from 'framer-motion';

const ParentAttendance = () => {
  const attendanceData = [
    { date: '2026-02-01', status: 'Có mặt', note: '' },
    { date: '2026-02-02', status: 'Vắng', note: 'Bị ốm' },
    { date: '2026-02-03', status: 'Muộn', note: 'Kẹt xe' },
  ];

  const calculateAttendanceRate = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter((item) => item.status === 'Có mặt').length;
    return ((present / total) * 100).toFixed(2);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="container mt-4">
        <h2 className="text-center text-light">Điểm danh</h2>
        <Tabs defaultActiveKey="month" id="attendance-tabs" className="mb-3">
          <Tab eventKey="month" title="Theo tháng">
            <table className="table table-dark table-striped">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, index) => (
                  <tr key={index}>
                    <td>{record.date}</td>
                    <td>{record.status}</td>
                    <td>{record.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-light mt-3">
              <p>Tỷ lệ chuyên cần: {calculateAttendanceRate()}%</p>
            </div>
          </Tab>
          <Tab eventKey="semester" title="Theo học kỳ">
            <p>Data for attendance by semester will be displayed here.</p>
          </Tab>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default ParentAttendance;
