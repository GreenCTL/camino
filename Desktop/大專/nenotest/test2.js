require('dotenv').config();
const express = require('express');
const axios = require('axios'); // ⭐ 新增 axios
const cors = require('cors');

const app = express();
const PORT = process.env.PORT; // 在 render 必須用 process.env.PORT

app.use(cors());

// 新增一個首頁，顯示一個按鈕，讓使用者點擊後看到資料
app.get('/', (req, res) => {
  res.send(`
    <html lang="zh-Hant">
      <head><meta charset="UTF-8"><title>城市資料表</title></head>
      <body>
        <h1>載入城市資料</h1>
        <button onclick="loadData()">載入資料</button>
        <pre id="result" style="background:#f0f0f0; padding:10px;"></pre>

        <script>
          async function loadData() {
            const response = await fetch('/fetch-cities');
            const data = await response.json();
            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
          }
        </script>
      </body>
    </html>
  `);
});

// 新增一個路由，後端去 fetch 外部的資料，然後回傳給前端
app.get('/fetch-cities', async (req, res) => {
  try {
    const response = await axios.get('https://test-camino.onrender.com/data?table=cities');
    res.json(response.data); // 把拿到的資料回傳給前端
  } catch (err) {
    console.error('❌ 抓取失敗：', err.message);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 啟動
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
