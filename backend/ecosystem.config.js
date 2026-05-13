module.exports = {
  apps: [
    {
      name: "mini-jira-backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
    },
  ],
};
