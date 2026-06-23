# 🔧 Ollama Local Model - Troubleshooting Guide

## ❌ Lỗi: "network error — This operation was aborted"

**Nguyên nhân chính:** Ollama không phản hồi trong 60 giây (timeout).

---

## ✅ Troubleshooting Steps

### 1️⃣ **Kiểm tra Ollama đang chạy**

```bash
# Terminal / PowerShell
curl http://localhost:11434/api/tags

# Kết quả mong đợi:
# {"models":[{"name":"llama3.3:latest",...}]}
```

**Nếu kết nối bị từ chối:**
- ❌ Ollama không chạy
- ✅ Khởi động lại: `ollama serve`

---

### 2️⃣ **Kiểm tra model đã load**

```bash
ollama list

# Kết quả mong đợi:
# NAME                    ID              SIZE      MODIFIED
# llama3.3:latest         <hash>          7.3 GB    30 minutes ago
# mistral:latest          <hash>          4.1 GB    1 day ago
```

**Nếu danh sách trống:**
- Pull model: `ollama pull llama3.3`
- Chờ download xong (~7GB cho llama3.3)

---

### 3️⃣ **Kiểm tra model đã sẵn sàng (không loading)**

```bash
# Nếu model đang loading (từ startup), nó sẽ xử lý chậm
ps aux | grep ollama
# Hoặc: tasklist | findstr ollama  (Windows PowerShell)
```

**Nếu Ollama process đang dùng 100% CPU:**
- Chờ model load xong (có thể 5-10 phút lần đầu)
- Hoặc tắt: `ollama stop` → start lại với model nhỏ hơn

---

### 4️⃣ **Kiểm tra baseUrl trong App**

- **Settings** → "Local Model" provider
- **Base URL** nên là: `http://localhost:11434`
- **KHÔNG** có trailing slash
- **KHÔNG** có `/v1` suffix (app sẽ thêm)

❌ SAI:
```
http://localhost:11434/
http://localhost:11434/v1
http://localhost:11434/api
```

✅ ĐÚNG:
```
http://localhost:11434
```

---

### 5️⃣ **Test từ Command Line**

```bash
# Gửi request tương tự như app
curl -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.3",
    "messages": [
      {"role": "user", "content": "Hello, list 3 colors"}
    ],
    "max_tokens": 100,
    "temperature": 0.3
  }' \
  --max-time 60

# Kết quả mong đợi: response JSON với model reply
```

**Nếu request timeout:**
- Model quá lớn → try `ollama pull mistral` (nhỏ hơn)
- Network issue → check firewall
- Ollama crash → check logs: `ollama logs`

---

### 6️⃣ **Open DevTools để xem Error Detail**

```
1. App → Press F12 để mở DevTools
2. Click "Console" tab
3. Gửi message trong chat
4. Xem error message đầy đủ
   - Click message để expand
   - Copy full error text
```

**Ví dụ error messages:**

| Error | Nguyên nhân | Fix |
|-------|-----------|-----|
| `ECONNREFUSED` | Ollama không chạy | `ollama serve` |
| `This operation was aborted` | Timeout (model chậm) | Chọn model nhỏ hơn |
| `Model not found` | Model chưa pull | `ollama pull <model>` |
| `{"error":"connection refused"}` | URL sai | Check base URL |

---

## 🚀 Quick Fix - Try Smallest Model

Nếu vẫn timeout, start với model nhỏ nhất:

```bash
# Unload lớn model (nếu đang load)
ollama list  # Check tên model

# Pull model nhỏ (1GB, rất nhanh)
ollama pull phi3:medium

# Trong App → Settings → chọn "Phi-3 Medium" → Save

# Test chat lại
```

**Model size comparison:**
| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| phi3:medium | 2.4 GB | ⚡⚡⚡ Very Fast | Good |
| mistral | 4.1 GB | ⚡⚡ Fast | Good |
| llama3.3 | 7.3 GB | ⚡ Medium | Excellent |
| llama2 | 3.8 GB | ⚡⚡ Fast | Good |

---

## 🔍 Advanced Debugging

### Check Ollama Logs

```bash
# macOS/Linux
tail -f ~/.ollama/logs/server.log

# Windows (if exists)
type "%APPDATA%\ollama\logs\server.log"
```

### Check Memory / Disk

```bash
# macOS/Linux
free -h  # Check RAM
df -h    # Check disk

# Windows PowerShell
Get-ComputerInfo | Select-Object CsTotalPhysicalMemory
Get-Volume
```

**Requirements:**
- RAM: At least 8GB (16GB recommended for llama3.3)
- Disk: At least 20GB free
- Network: Local connection only (no proxy issues)

### Restart Everything

```bash
# Kill all Ollama processes
killall ollama  # or: taskkill /IM ollama.exe /F  (Windows)

# Wait 10 seconds
sleep 10

# Start fresh
ollama serve

# In app: Test connection again
```

---

## ✅ Success Checklist

- [ ] Ollama running: `curl http://localhost:11434/api/tags` returns models
- [ ] Model loaded: `ollama list` shows at least one model
- [ ] Model size: Start with `phi3:medium` or `mistral` (not llama3.3 if first time)
- [ ] Base URL correct: `http://localhost:11434` (no trailing slash)
- [ ] App Settings → "Local Model" selected
- [ ] Model chosen in dropdown
- [ ] Settings saved
- [ ] Test Connection button shows ✓ Passed
- [ ] Chat message → Workflow generates successfully

---

## 📝 Performance Tips

1. **Keep Ollama running in background:**
   ```bash
   ollama serve &
   ```
   Or use `screen`/`tmux` for persistent session

2. **Preload model to RAM** (faster responses):
   ```bash
   ollama run llama3.3 << EOF
   exit
   EOF
   # Model stays loaded in memory for next request
   ```

3. **Reduce system load:**
   - Close unnecessary apps
   - Don't run other AI tools simultaneously
   - Check GPU availability (if CUDA installed)

4. **Use smaller tasks for workflow planning:**
   - ❌ "Write a comprehensive automation for my entire job"
   - ✅ "Open Chrome and navigate to Google"

---

## 🔗 Reference

- [Ollama Documentation](https://github.com/ollama/ollama)
- [OpenAI API Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- App Timeout: 60 seconds (increased from 12 seconds)
