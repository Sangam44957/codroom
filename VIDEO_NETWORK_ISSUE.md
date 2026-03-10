# Video Feature - Network Limitations

## Why Video Doesn't Work on Local Network IP

**Browser Security Requirement:**
- Camera/microphone access requires **HTTPS** or **localhost**
- Works on: `http://localhost:3000` ✅
- Doesn't work on: `http://10.170.232.122:3000` ❌

## What Works Without HTTPS:
✅ Socket.io real-time sync
✅ Code editor collaboration
✅ Chat messages
✅ Language switching
✅ Code execution
✅ User presence

## What Requires HTTPS:
❌ Camera access
❌ Microphone access
❌ Video calls

## Solutions:

### Option 1: Test Without Video (Recommended for now)
- Don't click the "🎥 Video" button on network devices
- All other features work perfectly
- This is fine for development/testing

### Option 2: Deploy to Production
When you deploy to a real domain with HTTPS, video will work:
- Vercel (frontend) - automatic HTTPS
- Railway/Render (socket server) - automatic HTTPS
- Then video works everywhere

### Option 3: Local HTTPS (Advanced)
Generate self-signed certificate:
```bash
# Install mkcert
choco install mkcert

# Create certificate
mkcert -install
mkcert localhost 10.170.232.122

# Update next.config.js and server/socket.js to use HTTPS
```

This is complex and not recommended for testing.

## Recommendation:
**For now, test everything EXCEPT video on the network.**
Video will work perfectly once deployed to production with HTTPS.
