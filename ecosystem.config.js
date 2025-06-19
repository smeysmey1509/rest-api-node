module.exports = {
    apps: [
        {
            name: "main-api",
            script: "./dist/main/server.js",
            instances: 1,
            exec_mode: "cluster",
            interpreter: "ts-node",
            env: {
                JWT_SECRET: process.env.JWT_SECRET
            }
        },
        {
            name: "worker",
            script: "./dist/worker/server.js",
            instances: 2,
            exec_mode: "fork",
            interpreter: "ts-node",
            env: {
                JWT_SECRET: process.env.JWT_SECRET
            }
        }
    ]
};
