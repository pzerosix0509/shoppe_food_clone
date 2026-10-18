const INITIAL_DISHES = [
  {
    name: "Phở Bò Tái Nạm Đặc Biệt",
    description:
      "Nước dùng ninh xương ống 18 tiếng chuẩn vị Hà Nội, thịt bò tươi thái mỏng kèm bánh phở mềm dai, hành lá và quẩy giòn.",
    price: 65000,
    originalPrice: 79000,
    category: "Món Nước",
    imageUrl:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    soldCount: 1420,
    prepTimeMin: 12,
    available: true,
  },
  {
    name: "Cơm Tấm Sườn Bì Chả Trứng",
    description:
      "Sườn cốt lết nướng than hoa thơm lừng, bì thính nhà làm, chả trứng hấp béo ngậy ăn kèm mỡ hành, đồ chua và nước mắm kẹo.",
    price: 58000,
    originalPrice: 68000,
    category: "Cơm Ngon",
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    soldCount: 2150,
    prepTimeMin: 15,
    available: true,
  },
  {
    name: "Bún Chả Hà Nội Truyền Thống",
    description:
      "Chả viên và thịt ba chỉ nướng xém cạnh trên than củi, nước mắm đu đủ xanh chua ngọt hài hòa kèm bún rối và rau sống tươi.",
    price: 60000,
    originalPrice: 70000,
    category: "Món Nước",
    imageUrl:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    soldCount: 980,
    prepTimeMin: 15,
    available: true,
  },
  {
    name: "Bánh Mì Chảo Bò Né Phô Mai",
    description:
      "Bò Mỹ áp chảo sốt tiêu đen, trứng ốp la lòng đào, pate gan ngỗng, phô mai kéo sợi kèm bánh mì nóng giòn rụm.",
    price: 72000,
    originalPrice: 85000,
    category: "Ăn Vặt & Bánh Mì",
    imageUrl:
      "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    soldCount: 840,
    prepTimeMin: 10,
    available: true,
  },
  {
    name: "Gỏi Cuốn Tôm Thịt Sốt Bơ Đậu Phộng",
    description:
      "Phần 4 cuốn đầy đặn với tôm sú tươi, thịt ba chỉ luộc, bún tươi và rau sống, chấm tương đen đậu phộng béo bùi.",
    price: 45000,
    originalPrice: 52000,
    category: "Ăn Vặt & Bánh Mì",
    imageUrl:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    soldCount: 1630,
    prepTimeMin: 8,
    available: true,
  },
  {
    name: "Trà Đào Cam Sả Khổng Lồ (Size L)",
    description:
      "Trà đen ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng tươi và hương sả thanh mát giải nhiệt tức thì.",
    price: 35000,
    originalPrice: 45000,
    category: "Đồ Uống & Tráng Miệng",
    imageUrl:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    soldCount: 3290,
    prepTimeMin: 5,
    available: true,
  },
  {
    name: "Cà Phê Muối Huế Kem Béo",
    description:
      "Cà phê Robusta Cầu Đất pha phin đậm đà phủ lớp kem muối mặn ngọt sánh mịn gây nghiện.",
    price: 32000,
    originalPrice: 39000,
    category: "Đồ Uống & Tráng Miệng",
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    soldCount: 2810,
    prepTimeMin: 5,
    available: true,
  },
  {
    name: "Lẩu Thái Tomyum Hải Sản (Phần 2 Người)",
    description:
      "Nước lẩu Tomyum chua cay chuẩn vị Thái với tôm sú, mực ống, nghêu, nấm kim châm, đậu hũ non và bún tươi.",
    price: 189000,
    originalPrice: 229000,
    category: "Món Nước",
    imageUrl:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    soldCount: 520,
    prepTimeMin: 20,
    available: true,
  },
  {
    name: "Cơm Gà Xối Mỡ Giòn Da Sốt Mắm Tỏi",
    description:
      "Đùi gà góc tư chiên xối mỡ da giòn rụm, rưới sốt mắm tỏi ớt đậm đà dùng kèm cơm chiên hạt điều và canh rong biển.",
    price: 55000,
    originalPrice: 65000,
    category: "Cơm Ngon",
    imageUrl:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    soldCount: 1740,
    prepTimeMin: 15,
    available: true,
  },
  {
    name: "Bánh Flan Caramel Cốt Dừa",
    description:
      "Bánh flan trứng sữa mềm mịn béo ngậy vị cốt dừa tươi và sốt caramel cà phê đắng nhẹ.",
    price: 25000,
    originalPrice: 30000,
    category: "Đồ Uống & Tráng Miệng",
    imageUrl:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    soldCount: 610,
    prepTimeMin: 5,
    available: false,
  },
];

const INITIAL_CHEFS = [
  {
    name: "Chef Nguyễn Hoàng Nam",
    specialty: "Ẩm thực truyền thống Bắc Bộ (Phở & Bún Chả)",
    experience: 12,
    bio: "Bếp trưởng với 12 năm kinh nghiệm tại các nhà hàng 5 sao Hà Nội, chuyên gia ninh nước dùng xương ống tự nhiên.",
    avatarUrl:
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Chef Trần Minh Tâm",
    specialty: "Món Nướng Than Hoa & Cơm Tấm Sài Gòn",
    experience: 9,
    bio: "Nghệ nhân ướp sườn nướng mật ong và chế biến các món cơm tấm trứ danh miền Nam.",
    avatarUrl:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Chef Lê Thảo Vy",
    specialty: "Pha Chế Đồ Uống & Tráng Miệng Hiện Đại",
    experience: 6,
    bio: "Chuyên gia R&D thức uống trái cây nhiệt đới, cà phê đặc sản và bánh ngọt thủ công.",
    avatarUrl:
      "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=400&q=80",
  },
];

const INITIAL_INGREDIENTS = [
  {
    name: "Thịt bò thăn nội tươi",
    unit: "kg",
    stock: 45,
    origin: "Trang trại bò tơ Củ Chi",
  },
  {
    name: "Sườn cốt lết heo VietGAP",
    unit: "kg",
    stock: 60,
    origin: "CP Fresh Mart Đồng Nai",
  },
  {
    name: "Gạo tấm thơm ST25",
    unit: "kg",
    stock: 200,
    origin: "Sóc Trăng, Việt Nam",
  },
  {
    name: "Tôm sú tươi sống (Size 30 con)",
    unit: "kg",
    stock: 35,
    origin: "Cà Mau, Việt Nam",
  },
  {
    name: "Hạt cà phê Robusta Honey",
    unit: "kg",
    stock: 50,
    origin: "Cầu Đất, Đà Lạt",
  },
  {
    name: "Đào ngâm vàng nguyên miếng",
    unit: "hộp",
    stock: 80,
    origin: "Kronos Hy Lạp",
  },
];

module.exports = {
  INITIAL_DISHES,
  INITIAL_CHEFS,
  INITIAL_INGREDIENTS,
};
