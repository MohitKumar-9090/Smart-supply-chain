const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/ai/chat', {
      message: 'Show me the most efficient routes today',
      conversationHistory: []
    });
    console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("ERROR STATUS:", err.response.status);
      console.error("ERROR DATA:", err.response.data);
    } else {
      console.error("ERROR:", err.message);
    }
  }
})();
