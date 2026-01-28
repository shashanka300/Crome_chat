## Component Architecture

The system consists of three primary parts:

1. **Ollama**: The local Large Language Model engine.
2. **Proxy Server**: A Node.js intermediary (`proxy-server.js`) that handles CORS and forwards requests to Ollama.
3. **Chrome Extension**: The frontend interface consisting of the manifest, background worker, content scripts, and side panel.

---

## Installation and Execution

### 1. Configure and Start Ollama

Ollama must be configured to accept requests from the Chrome extension environment. Open your terminal and execute:

```bash
export OLLAMA_ORIGINS="chrome-extension://*" ollama serve

```

### 2. Start the Proxy Server

The extension is configured to send requests to `http://localhost:8080`. You must run the provided proxy server to bridge the extension to Ollama.

```bash
node proxy-server.js

```

The proxy will listen on port 8080 and forward traffic to Ollama on port 11434.

### 3. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked".
4. Select the directory containing the `manifest.json` file.

---

## Technical Details

### Model Configuration

The extension is currently configured to use the following settings in `background.js`:

* **Model**: `granite3.2:8b`.
* **Endpoint**: `http://localhost:8080/api/chat`.
* **Streaming**: Disabled (`stream: false`).

### Permissions

The extension requires the following permissions to function:

* `sidePanel`: To display the chat interface.
* `activeTab` and `scripting`: To read the content of the current website.
* `host_permissions`: Specifically `http://localhost:11434/*` and `<all_urls>` to allow data fetching.

