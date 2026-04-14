const { predictDelay, optimizeRoute, chat } = require('./services/geminiService');
(async () => {
  try {
    const response = await chat("Test chat", []);
    console.log("Chat response:", response);
  } catch(e) {
    console.error("Crash:", e);
  }
})();
