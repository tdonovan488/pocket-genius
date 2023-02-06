var url = ""
var options = {"api_key":"","selected_site":""}
var questions = [];

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    url = tabs[0].url.toString();

    if(url.includes("?")){
        var index = url.lastIndexOf("/")
        url = url.slice(0,index)
    } 
});

chrome.storage.local.get(null).then((result) => {
    if(result.options){
        options = result.options
    }

    console.log(JSON.stringify(result))
    api_key_input.value = options.api_key

    console.log(JSON.stringify(result[url]))
    questions = result[url] ? result[url] : []

    if(questions.length){
        if (questionDropdown.children[0]) questionDropdown.children[0].remove()
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

const screenSelector = document.querySelector("#screen-selector");
const selectorChildren = screenSelector.children
const screenContainer = document.querySelector("#screen-container");
const screens = screenContainer.children
for(var i = 0; i < selectorChildren.length;i++){
    selectorChildren[i].addEventListener("click",function(){
        for(var i = 0; i < selectorChildren.length;i++){
            selectorChildren[i].id = ""
        }
        this.id = "selected-screen"

        selectedScreen = this.value
        for(var i = 0; i < screens.length;i++){
            screens[i].className = screens[i].id != selectedScreen ? "screen hidden" : "screen"
        }
    })
}

function updateData(){
    chrome.storage.local.set({ "options": options})
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"updateData","data":options},function(response){
            if(!response) return
        });
      });
    });
}

function handleResponse(response){
    if(!response) return
    if(response["type"] == "scrapeData"){
        questions = response["data"]
        Array.from(questionDropdown.children).forEach(element => {
            element.remove()
        });
        if (questionDropdown.children[0]) questionDropdown.children[0].remove()
        for(var i = 0;i< questions.length;i++){
            var option = document.createElement("option")
            option.innerHTML = "Question " + (i + 1)
            option.value = i
            questionDropdown.appendChild(option)
        }
        questionQuestionOutput.innerHTML = questions[0].question
        chrome.storage.local.set({[url]:questions})
    } else if(response["type"] == "autoSolveData"){
        questions = response["data"]
        if(questions[questionDropdown.value].solved){
            questionResponseOutput.innerHTML = questions[questionDropdown.value].response.choices[0].text
            questionAnswerOutput.innerHTML = questions[questionDropdown.value].answer
        }
    }
}


var api_key_input = document.querySelector("#api-key-input")
api_key_input.addEventListener("change",function(){
    console.log("API KEY: " + api_key_input.value)
    options.api_key = api_key_input.value
    updateData()
})

var scrapeButton = document.querySelector("#scrape-button")
var siteSelector = document.querySelector("#site-selector")
scrapeButton.addEventListener("click",scrapeQuestions)

function scrapeQuestions(){
    console.log("SENDING CLICK ACTION TO MAIN SCRIPT")
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {"type":"function","data":"scrape","site":siteSelector.value},function(response){
            console.log(response)
            handleResponse(response)
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
            handleResponse(response)
        });
      });
    });
}

var questionDropdown = document.querySelector("#question-selector");
var questionQuestionOutput = document.querySelector("#question-view")
var questionResponseOutput = document.querySelector("#question-response");
var questionAnswerOutput = document.querySelector("#question-answer")
var scrapeButton = document.querySelector("#scrape-button")
questionDropdown.addEventListener("change",function(){
    var index = questionDropdown.value
    questionQuestionOutput.innerHTML = questions[index].question
    if(!questions[index].solved) return;
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

