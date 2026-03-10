# Socket Connection Setup for Local Network

## Your Network Configuration:
- Your Computer IP: 10.170.232.122
- Socket Server Port: 3001
- Next.js Dev Server Port: 3000

## Step-by-Step Instructions:

### 1. Start Socket Server (Terminal 1)
```bash
npm run socket
```
You should see:
```
🚀 Socket.io server running on:
   Local:   http://localhost:3001
   Network: http://10.170.232.122:3001
```

### 2. Start Next.js Dev Server (Terminal 2)
```bash
npm run dev
```

### 3. Test on Your Computer First
Open browser: http://localhost:3000
- Create a room
- Check if "Connected" badge shows green
- Open browser console (F12) and look for: "✅ Connected to socket server"

### 4. Test on Another Device (Same WiFi)
Open browser: http://10.170.232.122:3000
- Join the same room
- Both devices should see each other's names
- Code changes should sync in real-time

## Troubleshooting:

### If "Disconnected" shows (red badge):
1. Check if socket server is running: `netstat -ano | findstr :3001`
2. Check Windows Firewall - allow port 3001
3. Check if both devices are on same WiFi network

### To Allow Port 3001 in Windows Firewall:
```bash
netsh advfirewall firewall add rule name="Socket.IO Server" dir=in action=allow protocol=TCP localport=3001
```

### To Check Your Current IP (if it changed):
```bash
ipconfig | findstr /i "IPv4"
```
If IP changed, update:
- src/hooks/useSocket.js (line 8)
- server/socket.js (line 7)

## Switch Back to Localhost Only:
In `src/hooks/useSocket.js`, swap the comments:
```javascript
// const SOCKET_URL = "http://10.170.232.122:3001";  // Comment this
const SOCKET_URL = "http://localhost:3001";          // Uncomment this
```
