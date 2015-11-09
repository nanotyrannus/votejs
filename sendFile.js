var express = require("express")
var app = express()
var formidable = require("formidable")
var chance = require("chance")
var form = new formidable.IncomingForm()
var cookieParser = require("cookie-parser")

app.use(cookieParser())

app.get("/", function(req, res) {
  res.sendFile("/media/Storage/dev/vote/proctor.html", null, function (err) {
    console.log(err)
  })
  res.end()
})

app.listen(3000)
