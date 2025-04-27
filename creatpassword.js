//存密碼的檔案，將密碼改成雜湊值在存到index.js
const bcrypt = require('bcrypt');

async function createHash() {
  const plainPassword = 'MFEE66'; // 🔥 這邊填你想要的明碼密碼
  const hash = await bcrypt.hash(plainPassword, 10);
  console.log('你的加密結果是：', hash);
}

createHash();