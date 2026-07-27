// PM2 Ecosystem Configuration for CodRoom
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "codroom-socket",
      script: "server/socket.mjs",
      cwd: "/home/ubuntu/codroom",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3002",  // Nginx proxies 3001 → 3002
      },
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Memory limit — restart if exceeds 512MB
      max_memory_restart: "512M",
      // Logs
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/ubuntu/codroom/logs/socket-error.log",
      out_file: "/home/ubuntu/codroom/logs/socket-out.log",
      merge_logs: true,
      // Watch (disabled in production)
      watch: false,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
