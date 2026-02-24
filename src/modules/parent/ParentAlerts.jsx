import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const ParentAlerts = () => {
  const shouldReduceMotion = useReducedMotion();
  const alerts = [
    { type: 'academic_decline', severity: 'warning', message: 'Học lực đang giảm 1.2 điểm so với HK1' },
    { type: 'low_subject_score', severity: 'danger', message: 'Môn Toán đang dưới trung bình' },
    { type: 'low_attendance', severity: 'warning', message: 'Tỷ lệ chuyên cần thấp (8%)' },
  ];

  const getAlertClass = (severity) => {
    switch (severity) {
      case 'danger':
        return 'alert-danger';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-secondary';
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="container mt-4">
        <h2 className="text-center text-light">Cảnh báo học tập</h2>
        {alerts.map((alert, index) => (
          <div key={index} className={`alert ${getAlertClass(alert.severity)}`} role="alert">
            {alert.message}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ParentAlerts;
