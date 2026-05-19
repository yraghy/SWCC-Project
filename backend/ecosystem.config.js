module.exports = {
  apps: [
    {
      name: "swcc-project-backend",
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
