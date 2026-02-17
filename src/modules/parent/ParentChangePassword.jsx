import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ParentChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }

    if (!/(?=.*\d)(?=.*[A-Z]).{8,}/.test(formData.newPassword)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và số.');
      return;
    }

    // Call API to change password
    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setSuccess('Mật khẩu đã được thay đổi thành công.');
          setError('');
        } else {
          setError(data.message || 'Đã xảy ra lỗi.');
        }
      })
      .catch(() => setError('Đã xảy ra lỗi khi kết nối với máy chủ.'));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="container mt-4">
        <h2 className="text-center text-light">Đổi mật khẩu</h2>
        <form onSubmit={handleSubmit} className="bg-dark text-light p-4 rounded">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label">Mật khẩu hiện tại</label>
            <input
              type="password"
              className="form-control"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label">Mật khẩu mới</label>
            <input
              type="password"
              className="form-control"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              className="form-control"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Đổi mật khẩu</button>
        </form>
      </div>
    </motion.div>
  );
};

export default ParentChangePassword;
