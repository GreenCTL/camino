const axios = require('axios');

async function getCitiesData() {
  try {
    const response = await axios.get('https://test-camino.onrender.com/data?table=cities');
    console.log("成功取得資料：");
    console.log(response.data); // 顯示從 API 抓回來的資料
  } catch (error) {
    console.error("❌ 抓取失敗：", error.message);
  }
}

getCitiesData();
