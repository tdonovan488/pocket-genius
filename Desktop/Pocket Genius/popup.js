
var url = ""
var api_key = "";
var questions = [];
var highlightCorrectAnswers = false;

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    url = tabs[0].url.toString();
});

chrome.storage.local.get(null).then((result) => {
    api_key = result.api_key
    api_key_input.value = api_key;

    highlightCorrectAnswers = Boolean(result.highlightCorrectAnswers)
    highlightAnswersSwitch.className = highlightCorrectAnswers ? "slider round enabled" : "slider round"

    console.log(JSON.stringify(result[url]))
    questions = result[url] ? result[url] : []

    if(questions.length){
        for(var i = 0;i< questions.length;i++){
            var option = document.createElement("option")
            option.innerHTML = "Question " + (i + 1)
            option.value = i
            questionDropdown.appendChild(option)
        }
        if(questions[0].solved){
            questionResponseOutput.innerHTML = questions[0].response.choices[0].text
            questionAnswerOutput.innerHTML = questions[0].answer
        }
        questionQuestionOutput.innerHTML = questions[0].question
    }

});



var api_key_input = document.querySelector("body > div > div:nth-child(4) > div > div.options > div:nth-child(1) > div.switchcontainer > input")
api_key_input.addEventListener("change",function(){
    console.log("API KEY: " + api_key_input.value)
    api_key = api_key_input.value
    chrome.storage.local.set({ "api_key": api_key })
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"updateData","data":"keyChange","api_key":api_key},function(response){
            if(!response) return
        });
      });
    });
})

var highlightAnswersToggle = document.querySelector("body > div > div:nth-child(4) > div > div.options > div:nth-child(2) > div.switchcontainer > label")
var highlightAnswersSwitch = document.querySelector("body > div > div:nth-child(4) > div > div.options > div:nth-child(2) > div.switchcontainer > label > span")

highlightAnswersSwitch.addEventListener("click",toggleHighlightAnswers)

function toggleHighlightAnswers(){
    highlightCorrectAnswers = !highlightCorrectAnswers
    console.log("SWITCH CLICKED",highlightCorrectAnswers)
    chrome.storage.local.set({"highlightCorrectAnswers":highlightCorrectAnswers})
    highlightAnswersSwitch.className = highlightCorrectAnswers ? "slider round enabled" : "slider round"
}

var scrapeButton = document.querySelector("#scrape-button")
scrapeButton.addEventListener("click",scrapeQuestions)

function scrapeQuestions(){
    console.log("SENDING CLICK ACTION TO MAIN SCRIPT")
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"function","data":"scrape"},function(response){
            if(!response) return
            if(response["type"] == "scrapeData"){
                questions = response["data"]
                Array.from(questionDropdown.children).forEach(element => {
                    element.remove()
                });
                for(var i = 0;i< questions.length;i++){
                    var option = document.createElement("option")
                    option.innerHTML = "Question " + (i + 1)
                    option.value = i
                    questionDropdown.appendChild(option)
                }
                questionQuestionOutput.innerHTML = questions[0].question
            }
        });
      });
    });
}

var autoSolveButton = document.querySelector("#auto-solve-button")
autoSolveButton.addEventListener("click",autoSolveQuestions)

function autoSolveQuestions(){
    if(!questions) return;
    console.log("SENDING CLICK ACTION TO MAIN SCRIPT (AUTOSOLVE)")
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"function","data":"autoSolve","questionData":questions},function(response){
            console.log(JSON.stringify(response))
            if(!response) return
            if(response["type"] == "autoSolveData"){
                questions = response["data"]
                questionResponseOutput.innerHTML = questions[questionDropdown.value].response.choices[0].text
                questionAnswerOutput.innerHTML = questions[questionDropdown.value].answer
            }
        });
      });
    });
}

var questionDropdown = document.querySelector("#questions");
var questionQuestionOutput = document.querySelector("body > div > div:nth-child(3) > div > div:nth-child(3) > div > p")
var questionResponseOutput = document.querySelector("body > div > div:nth-child(3) > div > div:nth-child(4) > div > p");
var questionAnswerOutput = document.querySelector("body > div > div:nth-child(3) > div > div:nth-child(5) > div > p")
var scrapeButton = document.querySelector("#scrape-button")
questionDropdown.addEventListener("change",function(){
    var index = questionDropdown.value
    questionQuestionOutput.innerHTML = questions[index].question
    if(!questions[index].response) return;
    questionResponseOutput.innerHTML = questions[index].response.choices[0].text
    questionAnswerOutput.innerHTML = questions[index].answer
})


const snackbar = document.querySelector("body > div > div.snackbar.hidden");
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "error") {
        } else if (request.msg === "progress"){
            if(request.data.subject === "AutoSolveProgress"){
                console.log(JSON.stringify(request))
                questionResponseOutput.innerHTML = "Currently Solving Questions..."
                questionAnswerOutput.innerHTML = "Auto Solve Progress: " + request.data.content +"/" + questions.length
            }
        }
    }
);
