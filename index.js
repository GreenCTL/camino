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
    const allowedTables = ['albergue', 'cities', 'diary', 'favorites', 'img', 'orders', 'quotes', 'routes', 'sight', 'stamps', 'users'];
  
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

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
