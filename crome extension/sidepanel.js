const chatDiv = document.getElementById('chat');
const input = document.getElementById('userInput');

// Helper: Append messages to the UI
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.style.marginBottom = "10px";
  msg.style.borderBottom = "1px solid #eee";
  msg.innerHTML = `<b>${sender}:</b> <p>${text}</p>`;
  chatDiv.appendChild(msg);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Helper: Get active tab with error checking
async function getActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      return null;
    }
    return tab;
  } catch (e) {
    return null;
  }
}

input.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter' && input.value.trim() !== '') {
    const query = input.value;
    input.value = '';
    appendMessage("User", query);

    const tab = await getActiveTab();
    if (!tab) {
      appendMessage("System", "Cannot read this page. Please try a standard website.");
      return;
    }

    try {
      appendMessage("System", "<i>Analyzing page and links...</i>");

      // 1. Get Layer 1 context from the Content Script
      // This is usually where "Receiving end does not exist" happens if page isn't refreshed
      const l1Data = await chrome.tabs.sendMessage(tab.id, { type: "GET_CONTEXT" });
      console.log("Layer 1 Data:", l1Data);

      // 2. Get Layer 2 context (Background script fetches the links)
      const l2Data = await chrome.runtime.sendMessage({ 
        type: "FETCH_LAYER_2", 
        links: l1Data.links 
      });
      console.log("Layer 2 Data:", l2Data);

      // 3. Construct the prompt for Ollama
      const systemPrompt = `You are a web assistant. 
      CONTEXT FROM CURRENT PAGE (Layer 1): ${l1Data.text}
      
      CONTEXT FROM LINKS ON PAGE (Layer 2): ${JSON.stringify(l2Data)}
      
      INSTRUCTIONS:
      - If the answer is in Layer 1, provide the answer and end with the exact quote in this format: QUOTE: "exact text"
      - If the answer is not on the page but in a link from Layer 2, tell the user to navigate to that specific link.
      - If you don't know, say you don't know.`;

      // 4. Send to Ollama via Background Script
      const response = await chrome.runtime.sendMessage({
        type: "ASK_OLLAMA",
        payload: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ]
      });

      if (response && response.message) {
        const aiText = response.message.content;
        appendMessage("AI", aiText);

        // 5. Trigger Highlighting if Layer 1 was used
        const quoteMatch = aiText.match(/QUOTE:\s*"(.*)"/);
        if (quoteMatch && quoteMatch[1]) {
          chrome.tabs.sendMessage(tab.id, { 
            type: "HIGHLIGHT", 
            quote: quoteMatch[1] 
          });
        }
      } else {
        throw new Error("Invalid response from Ollama");
      }

    } catch (err) {
      console.error("Error in sidepanel:", err);
      if (err.message.includes("Could not establish connection")) {
        appendMessage("System", "<b>Error:</b> Please refresh the webpage to enable the chat.");
      } else {
        appendMessage("System", "<b>Error:</b> " + err.message);
      }
    }
  }
});