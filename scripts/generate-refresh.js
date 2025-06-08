import jwt from "jsonwebtoken";

// Simulate user info
const payload = {
    id: "USER_ID_EXAMPLE", // Replace with actual user ID from your DB
};

const refreshSecret = "your_refresh_secret"; // Use your real env var or hardcode for test

// Create refresh token (valid for 7 days)
const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: "7d",
});

console.log("🔁 Your refresh token:\n", refreshToken);
