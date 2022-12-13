var url = ""
var questions;

var api_key;
var highlightCorrectAnswers = false;
chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    url = tabs[0].url.toString();
    console.log(url)
});

chrome.storage.local.get(null).then((result) => {
    console.log("API KEY: " + result.api_key)
    api_key = result.api_key
    api_key_input.value = api_key;

    highlightCorrectAnswers = result.highlightCorrectAnswers
    console.log(JSON.stringify(result))

    if(result[url]){
        questions = result[url]
        for(var i = 0;i< questions.questionCount;i++){
            var option = document.createElement("option")
            option.innerHTML = "Question " + (i + 1)
            option.value = i
            questionDropdown.appendChild(option)
        }
        if(questions.questions[0].response){
            questionResponseOutput.innerHTML = questions.questions[0].response.choices[0].text
        }
        questionQuestionOutput.innerHTML = questions.questions[0].question
    }
});



var api_key_input = document.querySelector("body > div > div:nth-child(6) > div > div.options > div:nth-child(1) > div.switchcontainer > input")
api_key_input.addEventListener("change",function(){
    console.log("API KEY: " + api_key_input.value)
    api_key = api_key_input.value
    chrome.storage.local.set({ "api_key": api_key })
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"startup","data":"keyChange","api_key":api_key},function(response){
            if(!response) return
        });
      });
    });
})

var highlightAnswersToggle = document.querySelector("body > div > div:nth-child(6) > div > div.options > div:nth-child(2) > div.switchcontainer > label")
var highlightAnswersSwitch = document.querySelector("body > div > div:nth-child(6) > div > div.options > div:nth-child(2) > div.switchcontainer > label > span")
highlightAnswersSwitch.className = highlightCorrectAnswers ? "slider round enabled" : "slider round"
highlightAnswersToggle.addEventListener("click",function(){
    highlightCorrectAnswers = !highlightCorrectAnswers
    chrome.storage.local.set({"highlightCorrectAnswers":highlightCorrectAnswers})
    highlightAnswersSwitch.className = highlightCorrectAnswers ? "slider round enabled" : "slider round"
})

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
                for(var i = 0;i< questions.questionCount;i++){
                    var option = document.createElement("option")
                    option.innerHTML = "Question " + (i + 1)
                    option.value = i
                    questionDropdown.appendChild(option)
                }
                questionQuestionOutput.innerHTML = questions.questions[0].question
                var obj = {[url]:questions}
                chrome.storage.local.set(obj)
            }
        });
      });
    });
}

var autoSolveButton = document.querySelector("#auto-solve-button")
autoSolveButton.addEventListener("click",autoSolveQuestions)

function autoSolveQuestions(){
    if(!questions) return;
    if(questions.questions[0].response) {
        console.log("DATA ALREADY EXISTS")
        return
    };
    console.log("SENDING CLICK ACTION TO MAIN SCRIPT (AUTOSOLVE)")
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"function","data":"autoSolve","questionData":questions},function(response){
            console.log("AUTOSOLVE RESPONSE: " + JSON.stringify(response))
            if(!response) return
            if(response["type"] == "responseData"){
                questions = response["data"]
                questionResponseOutput.innerHTML = questions.questions[questionDropdown.value].response.choices[0].text
                var obj = {[url]:questions}
                chrome.storage.local.set(obj)
            }
        });
      });
    });
}


var questions;
var questionDropdown = document.querySelector("#questions");
var questionQuestionOutput = document.querySelector("body > div > div:nth-child(5) > div > div:nth-child(3) > div > p")
var questionResponseOutput = document.querySelector("body > div > div:nth-child(5) > div > div:nth-child(4) > div > p");
var scrapeButton = document.querySelector("#scrape-button")
questionDropdown.addEventListener("change",function(){
    var index = questionDropdown.value
    questionQuestionOutput.innerHTML = questions.questions[index].question
    if(!questions.questions[index].response) return;
    questionResponseOutput.innerHTML = questions.questions[index].response.choices[0].text
})


chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {"type":"startup","data":{"api_key":api_key,"highlightCorrectAnswers":highlightCorrectAnswers}},function(response){
        if(!response) return
    });
  });
});