var questionCount = 1
var $ = function(elm) {
	return document.getElementById(elm)
}

function addQuestionInput() {
	var inputElement = document.createElement("input")
	inputElement.classList.add("pure-input-1")
	inputElement.classList.add("question")
	inputElement.placeholder = "Enter question text"
	var labelElement = document.createElement("label")
	labelElement.textContent = "Question " + questionCount++
	labelElement.for = inputElement.id
	document.forms["myform"].appendChild(labelElement)
	document.forms["myform"].appendChild(inputElement)
}

$("add-question").addEventListener("click", addQuestionInput)
$("submit").addEventListener("click", function () {
	var questions = document.querySelectorAll(".question")
	var fd = new FormData()
	var xml = new XMLHttpRequest()
	fd.append("quiz-name", $("quiz-name").value)
	var result = new Array()
	Array.prototype.forEach.call(questions, function (elm, i) {
			result.push(elm.value)
	})
	fd.append("questions", JSON.stringify(result))
	xml.open("POST", "http://localhost:3000/")
	xml.send(fd)
	xml.addEventListener("load", function(){
		var response = JSON.parse(xml.responseText)
		if (response.redirect) {
			window.location = response.redirect
		}
		//window.location = xml.responseText
	})
	xml.addEventListener("error", function () {
		console.log("Error")
	})
});
