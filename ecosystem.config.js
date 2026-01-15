module.exports = {
    apps: [
        {
            name: "main-api",
            script: "./dist/server.js",
            instances: "max",
            exec_mode: "cluster",
            watch: ["dist"],
            env: {
                JWT_SECRET: process.env.JWT_SECRET
            }
        },
        {
            name: "worker",
            script: "./dist/worker/server.js",
            instances: "max",
            exec_mode: "cluster",
            watch: ["dist/worker"],
            env: {
                JWT_SECRET: process.env.JWT_SECRET
            }
        }
    ]
};
