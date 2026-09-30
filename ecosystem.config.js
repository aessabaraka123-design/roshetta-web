module.exports = {
  apps: [
    {
      name: "roshetta-backend",
      script: "server.js",
      cwd: "./roshetta_server",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "roshetta-web",
      script: "npm",
      args: "start",
      cwd: "./web",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
