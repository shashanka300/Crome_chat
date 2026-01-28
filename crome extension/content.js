// 1. Scrape Layer 1 (Current Page)
function getPageData() {
  const links = Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .filter(href => href.startsWith('http'));

  return {
    text: document.body.innerText.substring(0, 5000),
    links: [...new Set(links)] // Unique links only
  };
}

// 2. Highlighting Logic
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "HIGHLIGHT") {
    const body = document.body;
    const regex = new RegExp(msg.quote, "gi");
    body.innerHTML = body.innerHTML.replace(regex, `<mark style="background: yellow; color: black;">$&</mark>`);
    
    // Scroll to first highlight
    const mark = document.querySelector('mark');
    if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// Listen for data requests from the SidePanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_CONTEXT") {
    sendResponse(getPageData());
  }
});