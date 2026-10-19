const path = require("node:path");
const express = require("express");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const webApp = express();
const publicDir = path.join(__dirname, "public");
const sharedCssPath = path.resolve(__dirname, "..", "src", "public", "styles.css");

// Serve shared ShopeeFood stylesheet and SPA static files
webApp.get("/styles.css", (req, res) => {
  res.sendFile(sharedCssPath);
});

webApp.use(express.static(publicDir, { index: false }));

// SPA Fallback: mọi đường dẫn của SPA đều trả về index.html (status 200)
// để Client-side Router đọc URL trên trình duyệt và hiển thị đúng trang
webApp.get("*", (req, res) => {
  res.status(200).sendFile(path.join(publicDir, "index.html"));
});

if (require.main === module) {
  const WEB_PORT = Number(process.env.WEB_PORT) || 5173;
  webApp.listen(WEB_PORT, () => {
    console.log("============================================================");
    console.log(`ShopeeFood SPA (web) đang chạy tại: http://localhost:${WEB_PORT}`);
    console.log(`Gọi REST API cross-origin tới:      http://localhost:${process.env.PORT || 3000}/api`);
    console.log("============================================================");
  });
}

module.exports = { webApp };
