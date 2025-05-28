module.exports = {
  apps: [
    {
      name: 'web-backend',
      script: './dist/src/main.js',
      out_file: '/var/log/backend-server/out.log',
      error_file: '/var/log/backend-server/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,
    },
  ],
};
