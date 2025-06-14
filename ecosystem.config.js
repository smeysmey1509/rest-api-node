module.exports = {
    apps: [{
        name: 'rest-api-node',
        script: './src/server.tj',
        instances: 4,
        interpreter: "node",
        exec_mode: 'cluster',
        watch: true,
        env: {
            port: 5002
        }
    },
        {
            name: "order-service",
            script: "./dist/server.js",
            cwd: "./order-service",
            instances: 4,
            exec_mode: "cluster",
            watch: false,
            env: {
                PORT: 5003
            }
        }
    ]
};
