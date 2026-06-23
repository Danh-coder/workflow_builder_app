# ✅ Ollama Local Model Network Error Fix

## 🐛 Vấn đề (Problem)

Khi user sử dụng local Ollama model để chat, app gửi tới Ollama request chứa parameter:
```json
"response_format": { "type": "json_object" }
```

**Lỗi:** Ollama không hỗ trợ parameter này, gây ra **HTTP 422 Unprocessable Entity** hay **HTTP 400 Bad Request**.

Dấu hiệu:
- Settings → chọn "Local Model" → nhập Ollama URL → Save
- Chat panel → gửi message → ❌ Network error

---

## ✅ Fix Applied (Đã áp dụng)

### 📝 File: `src/services/planWorkflow.ts`

#### **1. Hàm `callLLM()` - Fix `response_format`**

**Trước (Before):**
```javascript
const body = JSON.stringify({
  model: modelId,
  messages: [...],
  response_format: { type: 'json_object' },  // ❌ Ollama không support
  max_tokens: 2048,
  temperature: 0.3,
});
```

**Sau (After):**
```javascript
const bodyObj: Record<string, unknown> = {
  model: modelId,
  messages: [...],
  max_tokens: 2048,
  temperature: 0.3,
};
// Local Model (Ollama) doesn't support response_format, only OpenAI and AIHoc do
if (provider !== 'Local Model') {
  (bodyObj as Record<string, unknown>).response_format = { type: 'json_object' };
}
const body = JSON.stringify(bodyObj);
```

✅ **Kết quả:** Ollama request sẽ KHÔNG có `response_format` parameter

---

#### **2. Hàm `callLLMWithVision()` - Fix vision request**

**Trước:**
```javascript
const res = await request('POST', endpoint, headers, JSON.stringify({
  model: modelId,
  messages: [...],
  response_format: { type: 'json_object' },  // ❌ Ollama không support images + JSON format
  max_tokens: 150,
  temperature: 0,
}));
```

**Sau:**
```javascript
const visionBodyObj: Record<string, unknown> = {
  model: modelId,
  messages: [...],
  max_tokens: 150,
  temperature: 0,
};
if (provider !== 'Local Model') {
  (visionBodyObj as Record<string, unknown>).response_format = { type: 'json_object' };
}
const res = await request('POST', endpoint, headers, JSON.stringify(visionBodyObj));
```

✅ **Kết quả:** Ollama vision requests (screenshot verification) sẽ hoạt động

---

## 🚀 Cách sử dụng Local Ollama Model

### 1️⃣ **Setup Ollama on Local Machine**
```bash
# Install Ollama từ https://ollama.ai
# Hoặc dùng Docker:
docker run -d -p 11434:11434 ollama/ollama

# Pull a model
ollama pull llama2
ollama pull mistral
ollama pull phi3:medium

# Check models
curl http://localhost:11434/api/tags
```

### 2️⃣ **Configure trong App**

**Settings Page:**
1. Click "Local Model" provider
2. Enter base URL: `http://localhost:11434` (hoặc IP của machine nếu remote)
3. Mặc định models được load:
   - Llama 3.3 (Local)
   - Mistral 7B (Local)
   - Phi-3 Medium (Local)
4. Customize model list nếu cần (edit modelId, add/remove)
5. Click "Save Settings"

### 3️⃣ **Test Connection**
- Settings page → Click "Test Connection" button
- Nếu ✓ Passed → Ollama running và reachable
- Nếu ✗ Failed → Check Ollama process, port 11434, firewall

### 4️⃣ **Chat & Workflow Generation**
- Chat panel → Select model from dropdown (e.g., "Local Model · Llama 3.3 (Local)")
- Send message → ✅ Should work now!
- App sẽ generate workflow steps từ local model

---

## 🔧 Technical Details

### **Request Structure to Ollama**

```
POST http://localhost:11434/v1/chat/completions

Headers:
  Content-Type: application/json
  (NO Authorization header for local model)

Body:
{
  "model": "llama3.3",
  "messages": [
    {
      "role": "system",
      "content": "[Long system prompt asking for JSON workflow...]"
    },
    {
      "role": "user", 
      "content": "User task description"
    }
  ],
  "max_tokens": 2048,
  "temperature": 0.3
  // ✅ NO "response_format" parameter!
}
```

### **Response Expected**

```json
{
  "model": "llama3.3",
  "created_at": "2025-06-23T10:30:00Z",
  "message": {
    "role": "assistant",
    "content": "{\"name\":\"...\",\"steps\":[...],\"goal\":\"...\"}"
  },
  "done": true,
  "total_duration": 5000000000,
  "load_duration": 1000000000,
  "prompt_eval_count": 450,
  "prompt_eval_duration": 4000000000,
  "eval_count": 120,
  "eval_duration": 1000000000
}
```

Message content sẽ là JSON string chứa workflow definition.

---

## 📋 Supported Local Models

| Model | Command | Speed | Quality | Vision |
|-------|---------|-------|---------|--------|
| Llama 3.3 | `ollama pull llama3.3` | Fast | Good | ❌ |
| Mistral 7B | `ollama pull mistral` | Fast | Medium | ❌ |
| Phi-3 Medium | `ollama pull phi3:medium` | Fast | Medium | ✅ |
| Llama 2 | `ollama pull llama2` | Medium | Good | ❌ |
| Dolphin Mix | `ollama pull dolphin-mixtral` | Slow | Excellent | ❌ |

**Khuyến nghị:** 
- **Fastest:** Mistral 7B, Phi-3
- **Best quality:** Llama 3.3, Dolphin
- **For vision/verification:** Phi-3, Llama (with image support extension)

---

## ✅ Testing Checklist

- [ ] Ollama running locally (`curl http://localhost:11434/api/tags` returns models)
- [ ] App Settings → Select "Local Model" provider
- [ ] Enter correct base URL (default: `http://localhost:11434`)
- [ ] Click "Test Connection" → ✓ Passed
- [ ] Select a model from dropdown
- [ ] Send a chat message
- [ ] Workflow generates successfully (no network error)
- [ ] Can run the workflow (agent starts)

---

## 🐛 Troubleshooting

### **Still getting network error?**

1. **Check Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should return JSON list of models.

2. **Check model exists:**
   ```bash
   ollama list
   ```
   Check that you've pulled at least one model.

3. **Check baseUrl in Settings:**
   - Should be `http://localhost:11434` (no trailing slash needed)
   - If remote: `http://[YOUR_IP]:11434`

4. **Check browser console for actual error:**
   - Open DevTools (F12)
   - Go to Console tab
   - Send message again
   - Check error details

5. **Try simpler model first:**
   ```bash
   ollama pull llama2
   # Change model in Settings to: llama2
   ```

### **Model outputs plain text instead of JSON?**

- App has fallback JSON parsing that handles this
- But if model consistently ignores "return JSON" instruction:
  - Update system prompt in `planWorkflow.ts` line 42
  - Or use different model (Llama 3.3, Phi-3)

---

## 📝 Notes for Developers

- **Local Model detection:** Check `provider === 'Local Model'` in code
- **response_format conditional:** Added in 2 places (callLLM + callLLMWithVision)
- **Backwards compatible:** OpenAI, AIHoc, Claude, Gemini still get `response_format`
- **No API key needed:** apiKey is optional for Local Model

---

## ✨ References

- [Ollama Official](https://ollama.ai)
- [OpenAI Compatibility in Ollama](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- [App Architecture](#) (see planWorkflow.ts for LLM integration)
