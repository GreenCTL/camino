require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt')

const app = express();
const PORT = process.env.PORT;

// ⭐ 預設帳密（之後可以自己改）
const USERNAME = 'SteplyGo';
const PASSWORD_HASH = '$2b$10$XEByRDiRGQCW3iA5/bb/5uIfirM3F4JEvQ7l20xwrLmT1M65OkotO';

// 允許讀 JSON
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ⭐ 登入 API
app.post('/login', async(req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME ) {
    const match = await bcrypt.compare(password, PASSWORD_HASH);
  }if(match){
    return res.json({ success: true });
  } 
  else {
    res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
});

// ⭐ 取得資料 API（加上登入檢查）
app.get('/data', async (req, res) => {
  const { username, password, table } = req.query;
  if(!username || !password){
    return res.status(401).json({ error: '請輸入帳號或密碼' });
  }
  if (username !== USERNAME) {
    return res.status(401).json({ error: '帳號或密碼輸入錯誤' });
  }

  const match = await bcrypt.compare(password, PASSWORD_HASH);
  if (!match) {
    return res.status(401).json({ error: '密碼錯誤' });
  }

  if (!table) {
    return res.status(400).json({ error: "缺少 table 參數" });
  }

  try {
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const allowedTables = tablesResult.rows.map(row => row.table_name);

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: "資料表不存在" });
    }

    const result = await pool.query(`SELECT * FROM "${table}"`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ 錯誤內容：", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 首頁（帶輸入）
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head>
      <meta charset="UTF-8">
      <title>查詢資料表（需要登入）</title>
    </head>
    <body>
      <h1>請先輸入帳號密碼，再查詢資料表</h1>
      <input type="text" id="username" placeholder="帳號"><br><br>
      <input type="password" id="password" placeholder="密碼"><br><br>
      <input type="text" id="tableInput" placeholder="請輸入資料表名稱，例如 diary"><br><br>
      <button onclick="go()">送出查詢</button>

      <pre id="result"></pre>

      <script>
        async function go() {
          const username = document.getElementById('username').value.trim();
          const password = document.getElementById('password').value.trim();
          const table = document.getElementById('tableInput').value.trim();
          if (!username || !password || !table) {
            alert('請輸入帳號、密碼、資料表名稱');
            return;
          }
          const url = '/data?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&table=' + encodeURIComponent(table);
          const response = await fetch(url);
          const data = await response.json();
          document.getElementById('result').textContent = JSON.stringify(data, null, 2);
        }
      </script>
    </body>
    </html>
  `);
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
