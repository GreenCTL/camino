require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser'); //加入cookie

const app = express();
const PORT = process.env.PORT;

//  帳密設定
const USERNAME = 'SteplyGo';
const PASSWORD_HASH = '$2b$10$XEByRDiRGQCW3iA5/bb/5uIfirM3F4JEvQ7l20xwrLmT1M65OkotO';

//  簡單記錄登入狀態（只用在這台伺服器，不做真正 session）(已經用cookie代替)
// let isLoggedIn = false;

app.use(express.json());//express
app.use(cookieParser()) //cookie

//允許本機及外部的來源(react的app.js，localhost3002能夠抓取資料)
const corsOptions = {
    origin: true, //測試用，任何人都能夠fetch資料庫的資料，如果要上線，origin要設置能夠存取的port和網址，ex:['http://localhost:3002', 'https://test-camino.onrender.com']
    credentials: true //cookie為true時抓取資料
};

app.use(cors(corsOptions));//


//資料庫連線
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

//login 頁面
app.get('/login', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="zh-tw">
    <head>
      <meta charset="UTF-8">
      <title>登入</title>
    </head>
    <body>
      <h1>請登入</h1>
      <input type="text" id="username" placeholder="帳號"><br><br>
      <input type="password" id="password" placeholder="密碼"><br><br>
      <button onclick="login()">登入</button>

      <script>
        async function login() {
          const username = document.getElementById('username').value.trim();
          const password = document.getElementById('password').value.trim();
          const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await response.json();
          if (data.success) {
            alert('登入成功！即將跳轉到首頁');
            window.location.href = '/';
          } else {
            alert('登入失敗，請檢查帳號密碼');
          }
        }
      </script>
    </body>
    </html>
  `);
});

//  登入 API 採用cookie
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME) {
        const match = await bcrypt.compare(password, PASSWORD_HASH);
        if (match) {
            res.cookie('auth', 'true', { 
              maxAge: 5 * 60 * 1000, //cookie的存取時間為存5分鐘(分鐘*秒*毫秒)
              httpOnly: true,  //保護cookie不被前端拿走cookie的登入狀態
              //當process.env.NODE_ENV = production(上線)時，secure為true
              //如果當process.env.NODE_ENV = develoment(測試階段)，則secure為false(較寬鬆)
              secure:process.env.NODE_ENV === 'production', // 當為http時不啟動sercure，為https時啟動
              sameSite:process.env.NODE_ENV === 'production' //跨網域(http vs https)時使用
             }); 
            return res.json({ success: true });
        }
    }
    res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
});

//  登出 API (清除cookie)
app.get('/logout', (req, res) => {
    res.clearCookie('auth'); //清除cookie
    res.redirect('/login'); // 登出後直接跳轉回登入頁
});


//  首頁（需要已登入）
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="zh-tw">
    <head>
      <meta charset="UTF-8">
      <title>查詢資料表</title>
    </head>
    <body>
      <h1>查詢資料表資料</h1>
      <input type="text" id="tableInput" placeholder="請輸入資料表名稱，例如 diary"><br><br>
      <button onclick="go()">送出查詢</button>
      <button onclick="logout()">登出</button>

      <pre id="result"></pre>
<script>
  async function go() {
    const table = document.getElementById('tableInput').value.trim();
    if (!table) {
      alert('請輸入資料表名稱！');
      return;
    }
    const url = '/data?table=' + encodeURIComponent(table);
    const response = await fetch(url);

    if (response.status === 401) {
      //  如果是查 users 又沒登入，跳出登入提示
      alert('需要登入才能查詢 users 資料表，請先登入！');
      window.location.href = '/login'; // 跳轉到登入畫面
      return;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      let html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">';
      html += '<thead><tr>';

      Object.keys(data[0]).forEach(col => {
        html += '<th>'+col+'</th>';
      });
      html += '</tr></thead><tbody>';

      data.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(val => {
          html += '<td>'+val+'</td>';
        });
        html += '</tr>';
      });

      html += '</tbody></table>';

      document.getElementById('result').innerHTML = html;
    } else {
      document.getElementById('result').innerHTML = '查無資料';
    }
  }

  async function logout() {
    await fetch('/logout');
    alert('已登出');
    window.location.href = '/login';
  }
</script>


    </body>
    </html>
  `);
});

//  取得資料 API（也要判斷登入）(目前改成只有user資料才需要登入)
app.get('/data', async (req, res) => {
    const { table } = req.query;

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

        //  只有查 users 時檢查 cookie
        if (table === 'users') {
            if (req.cookies.auth !== 'true') {
                return res.status(401).send("需要登入才能查詢user資料")
            }
        }
        //查詢資料
        const result = await pool.query(`SELECT * FROM "${table}"`);
        res.json(result.rows);
    } catch (err) {
        console.error(" 錯誤內容：", err);
        res.status(500).json({ error: "伺服器錯誤" });
    }
});

// 啟動
app.listen(PORT, () => {
    console.log(` Server running on 連接埠(port): ${PORT}`);
});
