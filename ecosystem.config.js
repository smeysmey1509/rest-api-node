module.exports = {
    apps: [
        {
            name: "main-api",
            script: "./dist/main/server.js",
            instances: "max",
            exec_mode: "cluster",
            watch: ["dist/main"],
            env: {
                JWT_SECRET: process.env.JWT_SECRET
            }
        }
    ]
};
