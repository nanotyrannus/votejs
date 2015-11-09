var express = require('express')
var app = express()
var multer  = require('multer')
var upload = multer()

app.post('/', upload.array(), function (req, res, next) {
  // req.body contains the text fields
  console.log(req.body)
  res.send("Hello from the server!")
})

app.listen(3000)
