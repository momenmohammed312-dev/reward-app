module.exports = {
  apps: [{
    name: 'loyalty-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    env_file: '.env',
    max_memory_restart: '500M',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
  }],
};
