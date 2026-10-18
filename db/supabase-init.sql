-- ============================================================================
-- ShopeeFood Restaurant WebApp - PostgreSQL (Supabase) Schema & Seed Script
-- ============================================================================

DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS chefs CASCADE;
DROP TABLE IF EXISTS dishes CASCADE;

CREATE TABLE dishes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0),
  "originalPrice" INTEGER,
  category VARCHAR(100),
  "imageUrl" TEXT,
  rating REAL NOT NULL DEFAULT 4.8,
  "soldCount" INTEGER NOT NULL DEFAULT 0,
  "prepTimeMin" INTEGER NOT NULL DEFAULT 15,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE chefs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  experience INTEGER NOT NULL DEFAULT 3,
  bio TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 100,
  origin VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  "customerName" VARCHAR(255) NOT NULL,
  "customerPhone" VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  note TEXT,
  "voucherCode" VARCHAR(50),
  subtotal INTEGER NOT NULL,
  "shippingFee" INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'Đang chuẩn bị món',
  "itemsJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed Initial Dishes
INSERT INTO dishes (name, description, price, "originalPrice", category, "imageUrl", rating, "soldCount", "prepTimeMin", available) VALUES
('Phở Bò Tái Nạm Đặc Biệt', 'Nước dùng ninh xương ống 18 tiếng chuẩn vị Hà Nội, thịt bò tươi thái mỏng kèm bánh phở mềm dai.', 65000, 79000, 'Món Nước', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80', 4.9, 1420, 12, TRUE),
('Cơm Tấm Sườn Bì Chả Trứng', 'Sườn cốt lết nướng than hoa thơm lừng, bì thính nhà làm, chả trứng hấp béo ngậy ăn kèm mỡ hành & đồ chua.', 58000, 68000, 'Cơm Ngon', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80', 4.8, 2150, 15, TRUE),
('Bún Chả Hà Nội Truyền Thống', 'Chả viên và thịt ba chỉ nướng xém cạnh trên than củi, nước mắm đu đủ xanh chua ngọt hài hòa.', 60000, 70000, 'Món Nước', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80', 4.9, 980, 15, TRUE),
('Bánh Mì Chảo Bò Né Phô Mai', 'Bò Mỹ áp chảo sốt tiêu đen, trứng ốp la lòng đào, pate gan ngỗng, phô mai kéo sợi kèm bánh mì giòn rụm.', 72000, 85000, 'Ăn Vặt & Bánh Mì', 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80', 4.7, 840, 10, TRUE),
('Gỏi Cuốn Tôm Thịt Sốt Bơ Đậu Phộng', 'Phần 4 cuốn đầy đặn với tôm sú tươi, thịt ba chỉ luộc, bún tươi và rau sống, chấm tương đen đậu phộng.', 45000, 52000, 'Ăn Vặt & Bánh Mì', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', 4.8, 1630, 8, TRUE),
('Trà Đào Cam Sả Khổng Lồ (Size L)', 'Trà đen ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng tươi và hương sả thanh mát giải nhiệt.', 35000, 45000, 'Đồ Uống & Tráng Miệng', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', 4.9, 3290, 5, TRUE),
('Cà Phê Muối Huế Kem Béo', 'Cà phê Robusta pha phin đậm đà phủ lớp kem muối mặn ngọt sánh mịn gây nghiện.', 32000, 39000, 'Đồ Uống & Tráng Miệng', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', 4.9, 2810, 5, TRUE),
('Lẩu Thái Tomyum Hải Sản (Phần 2 Người)', 'Nước lẩu Tomyum chua cay chuẩn vị Thái với tôm sú, mực ống, nghêu, nấm kim châm và bún tươi.', 189000, 229000, 'Món Nước', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', 4.8, 520, 20, TRUE),
('Cơm Gà Xối Mỡ Giòn Da Sốt Mắm Tỏi', 'Đùi gà góc tư chiên xối mỡ da giòn rụm, rưới sốt mắm tỏi ớt đậm đà dùng kèm cơm chiên hạt điều.', 55000, 65000, 'Cơm Ngon', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80', 4.8, 1740, 15, TRUE),
('Bánh Flan Caramel Cốt Dừa (Hết món mẫu)', 'Bánh flan trứng sữa mềm mịn béo ngậy vị cốt dừa tươi và caramel đắng nhẹ.', 25000, 30000, 'Đồ Uống & Tráng Miệng', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80', 4.6, 610, 5, FALSE);

-- Seed Initial Chefs
INSERT INTO chefs (name, specialty, experience, bio, "avatarUrl") VALUES
('Chef Nguyễn Hoàng Nam', 'Ẩm thực truyền thống Bắc Bộ (Phở & Bún Chả)', 12, 'Bếp trưởng với 12 năm kinh nghiệm tại các nhà hàng 5 sao Hà Nội, chuyên gia ninh nước dùng xương ống tự nhiên.', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80'),
('Chef Trần Minh Tâm', 'Món Nướng Than Hoa & Cơm Tấm Sài Gòn', 9, 'Nghệ nhân ướp sườn nướng mật ong và chế biến các món cơm tấm trứ danh miền Nam.', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80'),
('Chef Lê Thảo Vy', 'Pha Chế Đồ Uống & Tráng Miệng Hiện Đại', 6, 'Chuyên gia R&D thức uống trái cây nhiệt đới, cà phê đặc sản và bánh ngọt thủ công.', 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=400&q=80');

-- Seed Initial Ingredients
INSERT INTO ingredients (name, unit, stock, origin) VALUES
('Thịt bò thăn nội tươi', 'kg', 45, 'Trang trại bò tơ Củ Chi'),
('Sườn cốt lết heo VietGAP', 'kg', 60, 'CP Fresh Mart Đồng Nai'),
('Gạo tấm thơm ST25', 'kg', 200, 'Sóc Trăng, Việt Nam'),
('Tôm sú tươi sống (Size 30 con)', 'kg', 35, 'Cà Mau, Việt Nam'),
('Hạt cà phê Robusta Honey', 'kg', 50, 'Cầu Đất, Đà Lạt'),
('Đào ngâm vàng nguyên miếng', 'hộp', 80, 'Kronos Hy Lạp');
