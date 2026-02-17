import React from 'react';
import { motion } from 'framer-motion';

const ParentComparison = () => {
  const comparisonData = [
    { subject: 'Toán', student_avg: 7.2, class_avg: 6.5 },
    { subject: 'Văn', student_avg: 6.8, class_avg: 6.2 },
    { subject: 'Anh', student_avg: 8.1, class_avg: 7.5 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="container mt-4">
        <h2 className="text-center text-light">So sánh lớp</h2>
        <table className="table table-dark table-striped">
          <thead>
            <tr>
              <th>Môn</th>
              <th>Con bạn</th>
              <th>Trung bình lớp</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((data, index) => (
              <tr key={index}>
                <td>{data.subject}</td>
                <td>{data.student_avg}</td>
                <td>{data.class_avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ParentComparison;
