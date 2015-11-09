"use strict"

var express = require("express")
var app = express()
var formidable = require("formidable")
var chance = require("chance")
var form = new formidable.IncomingForm()
var cookieParser = require("cookie-parser")
var WebSocketServer = require("ws").Server
var events = require("events")
var wss = new WebSocketServer({ "port" : 3001})

var quizzes = new Map()

wss.on("connection", function (ws) {
  var user = new User(ws) //should be added to some kind of data structure
  ws.on("message", function (message) {
    var parsed = JSON.parse(message)
    if (parsed.type === "auth") {
      console.log("recieved key " + parsed.instanceKey)
      console.log("server key " + quizzes.get(parsed.instanceID).key)
      if (quizzes.has(parsed.instanceID) && (quizzes.get(parsed.instanceID).key === parsed.instanceKey)) {
        quizzes.get(parsed.instanceID).addProctor(user)
        console.log("password match!")
      } else {
        console.log("mismatch")
        user.ws.close()
      }
    }
  })
})

app.use(cookieParser())

var ids = new Map()
function generateID(n) {
  var id;
  do {
    id = chance().string({
      "length" : n || 6,
      "pool" : "abcdefghijklmnopqrstuvwxyz" +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
      "0123456789"
    })
    ids.set(id, true)
  } while (!ids.has(id));
  return id
}

class Quiz {
  constructor(title) {
    this.title = title
  	this.participants = new Map()
  	this.questions = new Array()
    this.currentQuestion = 0
    this.countdown = 0 //holds remaining seconds of countdown
    this.countdownID = 0 //holds ID of countdown interval
    this.open = false //true when accepting answers
  	this.id = generateID()
    this.key = generateID()
  }

  addQuestion(question) {
  	this.questions.push(question)
  }

  startCountdown(seconds) {
    console.log("starCountdown called " + seconds)
    seconds = !Boolean(seconds) ? 30 : seconds
    seconds = (seconds < 0) ? 30 : seconds
    if (this.countdownID) {
      clearInterval(this.countdownID)
      this.countdownID = 0
    }
    this.countdown = seconds
    this.open = true
    this.countdownID = setInterval(function () {
      this.broadcastTime(this.countdown)
      if (this.countdown == 0) {
        this.open = false
        clearInterval(this.countdownID)
        this.countdownID = 0
      }
      this.countdown--
    }.bind(this), 1000)
  }

  cancelCountdown() {
    /* clear countdown timeout
       clear all answers
    */
    console.log("cancelCountdown called")
  }

  broadcastTime(seconds) {
    var msg = JSON.stringify({
      "type" : "time",
      "value" : seconds
    })
    console.log("broadcastTime msg: ")
    console.log("Quiz.broadcastTime " + msg)
    this.participants.forEach(function (participant) {
      console.log(msg)
      participant.send(msg)
    })
  }

  addProctor(user) {
    this.addUser(user)
    this.proctor = user
    user.on("command", function (message) {
      console.log(message)
      if (message.value === "countdown-start") {
        this.startCountdown(message.arg_0)
      } else if (message.value === "countdown-cancel") {
        this.cancelCountdown()
      }
    }.bind(this))
  }

  addUser(user) {
  	user.setQuiz(this)
  	this.participants.set(user.id, user)
  }

  removeUser(user){
  	this.participants.delete(user.id)
  }
}

class User extends events.EventEmitter {
  constructor(socket) {
    super()
  	this.quiz = null
  	this.ws = socket
    var messageTypeEmitter = function(message){
      message = JSON.parse(message)
      if (message.type === "command") {
        this.emit("command", message)
      } else if (message.type === "auth") {
        /*
        1. check if requested quiz exists
        2. check if key matches
        3. if key matches, add to quiz as proctor
        4. if key mismatch, disconnect
        */
      } else {
        console.log("Message type not recognised: <<" + message.type + ">>")
      }
    }.bind(this)
    this.addListener("command", function (command) {
      console.log("command event received")
      console.log(command)
    })
    this.ws.on("message", messageTypeEmitter)
  	this.id = generateID()
  }

  send(msg) {
    this.ws.send(msg)
  }

  setQuiz(quiz) {
  	this.quiz = quiz
    console.log("quiz set")
    console.log("quiz ID <<" + this.quiz.id +">>")
    console.log("user ID <<" + this.id + ">>")
    this.ws.on("close", function () {
      console.log("Lost connection with " + this.id)
      this.quiz.removeUser(this)
    }.bind(this))
  }
}

app.post("/", function (req, res, next) {
  form.parse(req, function (err, fields, files) {
    console.log(fields)
    var quiz = new Quiz()
    var questions = JSON.parse(fields.questions)
    questions.forEach(function (question) {
      quiz.addQuestion(question)
    })
    console.log(quiz)
    console.log("Quiz id: " + quiz.id)
    req.quizInstanceID = quiz.id
    req.quizInstanceKey = quiz.key
    quizzes.set(quiz.id, quiz)
    next()
  })
}, function (req, res) {
  res.cookie("vote_instanceKey", req.quizInstanceKey)
  // res.writeHead(301, {
  //   "Location" : "/instance/" + req.quizInstanceID
  // })
  res.send(JSON.stringify({"redirect" : "/instance/" + req.quizInstanceID}))
  //res.end("/instance/" + req.quizInstanceID)
  res.end()
})

app.get(/.*\.js/, function (req, res) {
  var file = req.url.split("/"), file = file[file.length - 1]
  res.sendFile(file, {"root" : process.env.PWD + "/js"})
})

app.get(/.*\.css/, function (req, res) {
  var file = req.url.split("/"), file = file[file.length - 1]
  res.sendFile(file, {"root" : process.env.PWD + "/css"})
})

app.get(/\/instance\/[0-9a-zA-Z]{6}/, function (req, res) {
  var instanceID = req.url.substring(10)
  console.log(instanceID)
  console.log(req.cookies)
  if (quizzes.has(instanceID)) {
    console.log("quizKey: " + req.cookies["vote_quizKey"])
    if (req.cookies["vote_instanceKey"] === quizzes.get(instanceID).key) {
      // res.send(new Buffer("proctor.html"))
      res.sendFile("proctor.html", {"root" : process.env.PWD}, function (err) {
        console.log(err)
      })
    } else {
      res.sendFile("participant.html", {"root" : process.env.PWD}, function (err) {
        console.log(err)
      })
    }
  } else {
    res.send("We couldn't find this room! Sorry!!!")
    res.end()
  }
})

app.get("/", function (req, res) {
	res.sendFile("index.html", {"root" : process.env.PWD})
})



app.listen(3000)
