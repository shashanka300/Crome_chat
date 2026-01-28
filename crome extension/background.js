// background.js

// 1. Set panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 2. Main Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_LAYER_2") {
    processLayer2(message.links).then(sendResponse);
    return true; 
  }
  
  if (message.type === "ASK_OLLAMA") {
    callOllama(message.payload).then(sendResponse);
    return true;
  }
});

// 3. Layer 2 Fetching Logic
async function processLayer2(links) {
  const results = await Promise.all(links.slice(0, 5).map(async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      // Clean HTML tags and take a snippet
      const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 800);
      return { url, content: cleanText };
    } catch (e) { return null; }
  }));
  return results.filter(r => r !== null);
}

// 4. Ollama API Call (Using Proxy)
async function callOllama(payload) {
  try {
    // Use proxy server instead of direct Ollama connection
    const response = await fetch("http://localhost:8080/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "granite3.2:8b", // Change to "llama3" if needed
        messages: payload,
        stream: false
      })
    });

    // Get the raw text ONCE
    const text = await response.text();
    
    // Check if response was OK after reading the body
    if (!response.ok) {
      throw new Error(`Ollama Error ${response.status}: ${text}`);
    }
    
    // Check for empty response
    if (!text || text.trim() === '') {
      throw new Error("Ollama returned an empty response.");
    }

    // Parse JSON with better error handling
    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseError) {
      console.error("JSON Parse Error. Raw response:", text);
      throw new Error(`Invalid JSON from Ollama: ${parseError.message}`);
    }

  } catch (error) {
    console.error("Critical Ollama Failure:", error);
    return { error: error.message };
  }
}