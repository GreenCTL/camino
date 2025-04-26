require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 中介
app.use(cors());


// API：取得資料庫資料
app.get('/data', async (req, res) => {
    const table = req.query.table;

    if (!table) {
        return res.status(400).json({ error: "缺少 table 參數" });
      }
    
      try {
        // 1. 先查出目前資料庫裡有哪些資料表
        const tablesResult = await pool.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `);
        const allowedTables = tablesResult.rows.map(row => row.table_name);
    
        // 2. 檢查請求的 table 是否存在
        if (!allowedTables.includes(table)) {
          return res.status(400).json({ error: "資料表不存在" });
        }
    
        // 3. 正常撈取資料
        const result = await pool.query(`SELECT * FROM "${table}"`);
        res.json(result.rows);
      } catch (err) {
        console.error("❌ 錯誤內容：", err);
        res.status(500).json({ error: "伺服器錯誤" });
      }

    if (!table || !allowedTables.includes(table)) {
      return res.status(400).json({ error: "無效或缺少 table 參數" });
    }
  
    try {
      const result = await pool.query(`SELECT * FROM "${table}"`);
      res.json(result.rows);
    } catch (err) {
      console.error("❌ 錯誤內容：", err);
      res.status(500).json({ error: "伺服器錯誤" });
    }
  });

//首頁
app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-Hant">
      <head>
        <meta charset="UTF-8">
        <title>查詢資料表</title>
      </head>
      <body>
        <h1>查詢資料表資料</h1>
        <input type="text" id="tableInput" placeholder="請輸入資料表名稱，例如 diary">
        <button onclick="go()">送出</button>
  
        <script>
          function go() {
            const table = document.getElementById('tableInput').value.trim();
            if (table) {
              window.location.href = '/data?table=' + encodeURIComponent(table);
            } else {
              alert('請輸入資料表名稱！');
            }
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
