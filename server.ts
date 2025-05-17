import express from 'express'
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const authRoutes = require('./routes/auth')
const cors = require('cors')

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

//Routes
app.use('/api/v1/auth', authRoutes)

//Connect to DB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB')
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server is running on port ${process.env.PORT || 5000}`)
    })
}).catch((err: string) => {
    console.error('Error connecting to MongoDB:', err)
})