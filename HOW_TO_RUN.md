# How to Run Dungeon Roll

## ❌ WRONG WAY (Will Show Blank Screen)
- Double-clicking `index.html`
- Opening `dist/index.html` in browser
- Using `file://` protocol

**Why it fails:** Browsers block ES modules on `file://` protocol due to CORS security.

## ✅ CORRECT WAY

### Option 1: Development Mode (Recommended)
```bash
cd /home/user/DungeonRoll
npm install
npm run dev
```
- Automatically opens browser at http://localhost:5173/
- Hot reload on file changes
- Better error messages
- Source maps for debugging

### Option 2: Production Build + Preview
```bash
cd /home/user/DungeonRoll
npm install
npm run build
npm run preview
```
- Opens at http://localhost:4173/
- Tests the production build
- Closer to deployment

### Option 3: Using Python Server (If npm fails)
```bash
cd /home/user/DungeonRoll
npm run build
cd dist
python3 -m http.server 8000
```
Then open: http://localhost:8000/

### Option 4: Using Node HTTP Server
```bash
npm install -g http-server
cd /home/user/DungeonRoll/dist
http-server -p 8080
```
Then open: http://localhost:8080/

## 🎮 What You Should See

After running correctly:
1. **Loading screen** (1 second): "Loading Dungeon Roll..."
2. **Dark background** with Babylon.js 3D scene
3. **Combat UI** panel appears centered on screen
4. **Console logs** showing initialization

## 🔍 Debugging

Open browser console (F12) and look for:
```
DOMContentLoaded event fired
Canvas element found
Babylon engine initialized
Game initialized. Current state: TITLE
=== Running Combat Test Harness ===
...
=== Initializing Combat UI ===
Combat UI ready! Click Attack or Guard buttons to play.
```

## ⚠️ Common Errors

### "Failed to load resource: net::ERR_FAILED"
- You're using file:// protocol
- **Fix:** Use `npm run dev` instead

### "Cross origin requests are only supported for protocol schemes"
- CORS error from file:// protocol
- **Fix:** Use a web server (npm run dev)

### "Cannot find module 'babylonjs'"
- Dependencies not installed
- **Fix:** Run `npm install` first

## 📝 Quick Reference

```bash
# First time setup
npm install

# Development (use this most of the time)
npm run dev

# Production build
npm run build
npm run preview
```
