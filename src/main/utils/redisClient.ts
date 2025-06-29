import { createClient } from "redis";

const redisClient = createClient()

redisClient.on("error", err => {console.error("❌ Redis Client Error", err)})

redisClient.connect().then(err => {
    console.log("✅ Redis connected");
})

export default redisClient;