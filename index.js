const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const UserSchema = new mongoose.Schema({			//schema
  username: { type: String, required: true }
});
 
const ExerciseSchema = new mongoose.Schema({    //schema
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
})

const User = mongoose.model('User', UserSchema)   //model
const Exercise = mongoose.model('Exercise', ExerciseSchema)

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//POST
  // create a new user 
app.post('/api/users', async (req, res) => {
  const username = req.body.username
  try {
    const user = await User.create({ username })
    res.json({ username: user.username, _id: user._id })
  } catch (err) {
    res.status(400).json({ error: 'Failed to create user' })
  }
})

  // add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id
  const { description, duration, date } = req.body

  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Parse and validate date
    let exerciseDate = new Date(date)
    if (date === undefined || isNaN(exerciseDate.getTime())) {
      exerciseDate = new Date()
    }

    const exercise = new Exercise({
      userId: id,
      description,
      duration: Number(duration),
      date: exerciseDate
    })

    await exercise.save()

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(400).json({ error: 'Failed to add exercise' })
  }
})
  


//GET
  // check all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({})
    res.json(users)
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch users' })
  }
})
  
  // check user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params
  const { from, to, limit } = req.query

  try {
    const user = await User.findById(_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let dateFilter = {}
    if (from || to) {
      dateFilter.date = {}
      if (from) dateFilter.date.$gte = new Date(from)
      if (to) dateFilter.date.$lte = new Date(to)
    }

    let exercises = await Exercise
      .find({ userId: _id, ...dateFilter })
      .limit(+limit || 0)
      .exec()
    
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))      

    // 💡 Debug
    console.log('DEBUG log entry:', log[0])
    console.log('DEBUG typeof date:', typeof log[0].date)
    
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    })
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch logs'})
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
