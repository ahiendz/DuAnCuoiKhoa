import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import { motion } from 'framer-motion';

const ParentGrades = () => {
  const gradesData = [
    { subject: 'Toán', oral: 8, quiz: 7, test: 6, midterm: 7, final: 8, average: 7.2 },
    { subject: 'Văn', oral: 6, quiz: 6.5, test: 7, midterm: 6, final: 7, average: 6.5 },
    { subject: 'Anh', oral: 9, quiz: 8.5, test: 8, midterm: 9, final: 9, average: 8.5 },
  ];

  const getColor = (average) => {
    if (average >= 8) return 'text-success';
    if (average >= 6) return 'text-warning';
    return 'text-danger';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="container mt-4">
        <h2 className="text-center text-light">Bảng điểm</h2>
        <Tabs defaultActiveKey="hk1" id="grades-tabs" className="mb-3">
          <Tab eventKey="hk1" title="Học kỳ 1">
            <table className="table table-dark table-striped">
              <thead>
                <tr>
                  <th>Môn</th>
                  <th>Miệng</th>
                  <th>15p</th>
                  <th>1 tiết</th>
                  <th>GK</th>
                  <th>CK</th>
                  <th>Trung bình</th>
                </tr>
              </thead>
              <tbody>
                {gradesData.map((grade, index) => (
                  <tr key={index}>
                    <td>{grade.subject}</td>
                    <td>{grade.oral}</td>
                    <td>{grade.quiz}</td>
                    <td>{grade.test}</td>
                    <td>{grade.midterm}</td>
                    <td>{grade.final}</td>
                    <td className={getColor(grade.average)}>{grade.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tab>
          <Tab eventKey="hk2" title="Học kỳ 2">
            <p>Data for Học kỳ 2 will be displayed here.</p>
          </Tab>
          <Tab eventKey="year" title="Cả năm">
            <p>Data for Cả năm will be displayed here.</p>
          </Tab>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default ParentGrades;
