// pm2.config.js
module.exports = {
    apps: [
        {
            name: "main-api",
            script: "./dist/main/server.js",
            exec_mode: "cluster",
            instances: "max",
            watch: false
        },
        {
            name: "worker",
            script: "./dist/worker/server.js",
            watch: false
        }
    ]
};