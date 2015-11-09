var formidable = require('formidable')
var http = require('http')
var express = require("express")
var app = express()

var form = new formidable.IncomingForm()

app.use("/", function (req, res, next) {
  form.parse(req, function (err, fields, files) {
    if(err) {
      console.error(err.stack)
      next(err)
    } else {
      req.fields = fields
      req.files = files
      next()
    }
  })
})

app.post("/", function (req, res) {
  console.log(req.headers)
  console.log(req.fields)
  console.log(req.files)
  res.send("blah")
})

app.listen(3000)
