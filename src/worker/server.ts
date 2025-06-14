import express from "express";

const app = express();
const PORT = process.env.PORT || 5003;

app.use(express.json());

app.get("/api/v1/orders", (_req, res) => {
    res.json({ message: "Order list (from new apppp)" });
});

// Debug endpoint
app.get("/debug", (_req, res) => {
    res.json({
        service: "order-service",
        pid: process.pid,
        pm_id: process.env.pm_id || "unknown",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});
