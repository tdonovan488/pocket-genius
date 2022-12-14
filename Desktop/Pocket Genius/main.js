var api_key = ""
var MODEL = "text-davinci-003"
var highlightAutoSolveAnswersToggled = false;
var highlightAutoSolveAnswers = false;
const clarifyAnswers = false;

var questions;

var url = document.location.href
chrome.storage.local.get(null).then((result) => {
    api_key = result.api_key

    highlightAutoSolveAnswersToggled = Boolean(result.highlightCorrectAnswers)
    questions = result[url]
});

function parseCanvasMultipleChoice(){
    var questionContainer = document.querySelector("#questions")
    console.log(questionContainer)
    var questionsElements = []
    for(var i = 0; i < questionContainer.children.length;i++){
        var child = questionContainer.children[i];
        if(child.ariaLabel == "Question"){
            questionsElements.push(child);
        }
    }

    var questions = {"questionCount":questionsElements.length,"questions":[]}
    for(var x = 0; x < questionsElements.length; x++){
        questions.questions.push({"question":"","answers":[],"answerElements":[],"prompt":"","response":"","answer":""})
        var elementChildren = Array.from(questionsElements[x].children)
        elementChildren.forEach(elementChild =>{
            if(elementChild.id.includes("question_")){
                var childChildren = Array.from(elementChild.children);
                childChildren.forEach(childChild =>{
                    if(childChild.className == "text"){
                        var childChildChildren = Array.from(childChild.children)

                        for(var i = 0; i < childChildChildren.length;i++){
                            var childChildChild = childChildChildren[i]
                            if(childChildChild.id.includes("question_text")){
                                var questionTextChild = childChildChild
                                if(!questionTextChild) continue;

                                questions.questions[x].question = questionTextChild.innerText
                            }
                            if(childChildChild.className == "answers"){
                                var answerWrapper = Array.from(childChildChild.children[0].children)
                                var answerText = []
                                var answerElements = []
                                answerWrapper.forEach(answer =>{
                                    if(answer.className.includes("answer") || answer.className == "answer"){
                                       var text;
                                        try{
                                            // console.log(answer.children[0].children[1].innerText)
                                            text = answer.children[0].children[1].innerText
                                        } catch{}
                                        try{
                                            if(!text){
                                                // console.log(answer.children[1].children[1].children[0].innerText)
                                                text = answer.children[1].children[1].children[0].innerText
                                            }
                                        } catch{}
                                        try{
                                            if(!text){
                                                // console.log(answer.children[1].children[1].children[1].children[0].innerText)
                                                text = answer.children[1].children[1].children[1].children[0].innerText
                                            }
                                        } catch{}
                                        answerElements.push(getElementXPath(answer))
                                        answerText.push(text)
                                    }
                                })
                                questions.questions[x].answers = answerText
                                questions.questions[x].answerElements = answerElements
                            }
                        }
                    }
                })
            }
        })
        questions.questions[x].prompt = questions.questions[x].question + "\n" + questions.questions[x].answers.join("\n") + "\n"
    };
    document.dispatchEvent(new CustomEvent("mainScript",{"type":"questionsData","data":questions}))
    console.log(questions.questions[0])
    return questions
}


async function sendPromptToAI(prompt){
    if(!api_key) return
    const response = await fetch("https://api.openai.com/v1/completions",{
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key
        },
        body: JSON.stringify({
            "model":MODEL,
            "prompt":prompt,
            "temperature":0,
            "max_tokens":50,
        })
    })
    return response.json()
}
async function parseAIResponse(text,answers){
    for(var i = 0; i < answers.length;i++){
        if(text.toLowerCase().includes(answers[i].toLowerCase()) || text.toLowerCase() == answers[i].toLowerCase()){
            var previousText = text.toLowerCase().split(answers[i].toLowerCase())[0]
            for(var x = 0; x < answers.length;x++){
                if(answers[x] == answers[i]) continue
                if(previousText.includes(answers[x].toLowerCase())){
                    return answers[x]
                }
            }
            return answers[i]
        }
    }
    var match = await checkForMatch(text,answers)
    if(match) return match
    return clarifyAnswers ? await askForClarification(text,answers) : null
}

async function checkForMatch(response,potentialAnswers){
    var bestScore = 0
    var bestIndex = 0
    var bestLength = 0
    for(var i = 0; i < potentialAnswers.length; i++){
        var answerWords = potentialAnswers[i].toLowerCase().replace(/[^A-Za-z0-9\s]/g,'').split(" ")
        var matchCount = 0
        for(var x = 0; x < answerWords.length;x++){
            if(response.toLowerCase().replace(/[^A-Za-z0-9\s]/g,'').includes(answerWords[x])){
                matchCount++
            }
        }
        var score = matchCount/answerWords.length
        if (score > bestScore || (bestScore == score && bestLength < answerWords.length)){
            bestScore = score
            bestIndex = i
            bestLength = answerWords.length
        }
    }
    if(bestScore > 0){
        return potentialAnswers[bestIndex]
    }

    return null
}

async function askForClarification(response,potentialAnswers){
    for(var i = 0;i < potentialAnswers.length;i++){
        const prompt = "Does '" + response + "' Mean the same thing as '" + potentialAnswers[i] + "'"
        const newResponse = await sendPromptToAI(prompt)
        if(newResponse.choices[0].text.toLowerCase().includes("yes,")){
            return potentialAnswers[i]
        }
    }
    return null
}

var autoSolveProgress = 0
async function autoSolveQuestions(){
    var responseFilled = questions
    for(var i = 0; i < questions.questionCount;i++){
        autoSolveProgress = i + 1 
        chrome.storage.local.set({"autoSolveProgress":autoSolveProgress})
        if(responseFilled.questions[i].response.choices) continue
        const response = await sendPromptToAI(questions.questions[i]["prompt"])
        if(response.error) {
            autoSolveProgress = 0
            var obj = {[url]:responseFilled}
            chrome.storage.local.set(obj)
            chrome.storage.local.set({"autoSolveProgress":autoSolveProgress})
            return responseFilled
        }
        highlightAnswers()
        const answer = await parseAIResponse(response.choices[0].text,questions.questions[i]["answers"])
        responseFilled.questions[i].answer = answer
        responseFilled.questions[i].response = response
        console.log("Question " + (i+1) + " Answer: " + answer)
    }
    autoSolveProgress = 0
    chrome.storage.local.set({"autoSolveProgress":autoSolveProgress})
    var obj = {[url]:responseFilled}
    chrome.storage.local.set(obj)
    return responseFilled
}

function highlightAnswers(){
    for(var i = 0; i < questions.questionCount;i++){
        var answer = questions.questions[i].answer
        if(!answer) return
        var index = questions.questions[i].answers.indexOf(answer)
        var element = getElementByXpath(questions.questions[i].answerElements[index])
        if(!element) return

        if(highlightAutoSolveAnswers){
            element.style = "background-color: #90EE90;"
        } else {
            element.style = ""
        }
    }

    
}

function scrapeTest(){
    return parseCanvasMultipleChoice()
}
function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
function getElementXPath(element) {
    if (!element) return null
  
    if (element.id) {
      return `//*[@id="${element.id}"]`
    } else if (element.tagName === 'BODY') {
      return '/html/body'
    } else {
      const sameTagSiblings = Array.from(element.parentNode.childNodes)
        .filter(e => e.nodeName === element.nodeName)
      const idx = sameTagSiblings.indexOf(element)
  
      return getElementXPath(element.parentNode) +
        '/' +
        element.tagName.toLowerCase() +
        (sameTagSiblings.length > 1 ? `[${idx + 1}]` : '')
    }
  }
  

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(JSON.stringify(request))
    if(!request) return
    if(request["type"] == "function"){
        if(request["data"] == "scrape"){
            questions = scrapeTest()
            var response = {"type":"scrapeData","data":questions}
            sendResponse(response)
            return true
        }
        else if(request["data"] == "autoSolve"){
            questions = request.questionData;
            (async () => {
                questions = await autoSolveQuestions()
                sendResponse({"type":"responseData","data":questions})
            })();
            return true
        }
    } else if(request["type"] == "updateData"){
        if(request["data"] == "keyChange"){
            api_key = request["api_key"]
            return true
        } else if(request["data"] == "highlightChange"){
            highlightAutoSolveAnswersToggled = request["highlightAutoSolveAnswers"]
            if(!highlightAutoSolveAnswersToggled) {
                highlightAutoSolveAnswers = false
                highlightAnswers()
            }
            return true
        }
    } else if(request["type"] == "progress"){
        if(request["data"] == "autoSolve"){
            sendResponse({"type":"autoSolveProgress","data":autoSolveProgress})
        }
    }
})


document.addEventListener("keydown",function(e){
    if(e.keyCode == 72 && highlightAutoSolveAnswersToggled){
        highlightAutoSolveAnswers = !highlightAutoSolveAnswers
        highlightAnswers()
    }
})
