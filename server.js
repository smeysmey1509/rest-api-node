const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const authRoutes = require('./routes/auth')

dotenv.config()

const app = express()
app.use(express.json())

//Route
app.use('/api/auth', authRoutes)

//Connect to DB
mongoose.connect("mongodb+srv://dbSmey:123@cluster0.rs2f8ug.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB')
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server is running on port ${process.env.PORT || 5000}`)
    })
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err)
})