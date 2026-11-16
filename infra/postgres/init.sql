-- Khởi tạo cơ sở dữ liệu PostgreSQL cho GDMAS
-- Bắt buộc chuẩn múi giờ UTC và hệ tọa độ WGS84

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Thiết lập timezone mặc định sang UTC
SET timezone = 'UTC';

