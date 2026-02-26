# Sử dụng image Node.js chính thức làm base
FROM node:20-slim

# Cài đặt các وابستگی hệ thống cần thiết cho Python, CMake, dlib và Face Recognition
# dlib yêu cầu build từ source nên cần cmake, g++, và build-essential
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-python-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file package.json và cài đặt dependencies cho Node.js
COPY package*.json ./
RUN npm install --production

# Cài đặt các thư viện Python cần thiết cho Face Recognition
RUN pip3 install --no-cache-dir numpy face_recognition --break-system-packages

# Sao chép toàn bộ mã nguồn vào image
COPY . .

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=10000
ENV PYTHON_BIN=python3

# Mở cổng 10000 (Render mặc định)
EXPOSE 10000

# Chạy server
CMD ["node", "server.js"]
