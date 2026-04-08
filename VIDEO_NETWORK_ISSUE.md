# Video Feature - Network Limitations

## Why Video Doesn't Work on Local Network IP

**Browser Security Requirement:**
- Camera/microphone access requires **HTTPS** or **localhost**
- Works on: `http://localhost:3000` ✅
- Doesn't work on: `http://10.x.x.x:3000` ❌

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

## NAT Traversal (STUN vs TURN)

The app ships with multiple STUN servers. STUN works for most home/office networks
but fails across symmetric NAT (common in corporate environments).

For reliable video across all networks, configure a TURN server:

```env
NEXT_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-credential
```

When these vars are set, the TURN server is automatically included in the ICE
configuration. Without them, the app falls back to STUN-only.

Free/cheap TURN options:
- [Metered.ca](https://www.metered.ca/tools/openrelay/) — free tier available
- [Twilio Network Traversal Service](https://www.twilio.com/stun-turn)
- Self-hosted [coturn](https://github.com/coturn/coturn)

## Solutions for Local Development

### Option 1: Test Without Video
- Don't click the "🎥 Video" button on network devices
- All other features work perfectly

### Option 2: Deploy to Production
When deployed to a real domain with HTTPS, video works automatically.
Vercel and Railway/Render both provide automatic HTTPS.

### Option 3: Local HTTPS (Advanced)
```bash
choco install mkcert
mkcert -install
mkcert localhost 10.x.x.x
```
Then configure Next.js and the socket server to use the generated certificate.
