const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    const newUser = new User({ username })
    await newUser.save()
    res.json({ username: newUser.username, _id: newUser._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    const { description, duration, date } = req.body

    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const exerciseDate = date ? new Date(date) : new Date()
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    })
    await newExercise.save()

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' })
  }
})

// Get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query

    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    let filter = { userId: _id }
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }

    const exercises = await Exercise.find(filter)
      .limit(parseInt(limit) || 0)
      .select('description duration date')

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})