const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const auth = require('../middleware/auth')
const router = express.Router()

//Protected route
router.get("/dashboard", auth, async (req, res) => {
    res.json({ msg: `Welcome to your dashboard, user ID: ${req.user.id}` });
})

//Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body

        let user = await User.findOne({ email })
        if (user) return res.status(400).json({
            message: 'User already exists'
        })

        const hashedPassword = await bcrypt.hash(password, 10)

        user = new User({
            name,
            email,
            password: hashedPassword
        })
        await user.save()

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        })

        res.json({
            token, user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

//Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({
            message: 'User Does not exist'
        })

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.status(400).json({
            message: 'Invalid credentials'
        })

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        })

        res.json({
            token, user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

module.exports = router