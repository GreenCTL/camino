require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 中介
app.use(cors());

// API：取得資料庫資料
app.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diary'); // 直接撈 diary
    res.json(result.rows);
  } catch (err) {
    console.error('❌ 錯誤：', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
