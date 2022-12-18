var api_key = ""
var MODEL = "text-davinci-003"
var highlightCorrectQuestions = false;
const clarifyAnswers = false;

var questions = [];

var url = document.location.href
chrome.storage.local.get(null).then((result) => {
    api_key = result.api_key

    highlightCorrectAnswers = Boolean(result.highlightCorrectAnswers)
    questions = result[url] ? result[url] : []
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
    questions = []
    for(var x = 0; x < questionsElements.length; x++){
        questions.push({"question":"","answers":[],"answerElements":[],"prompt":"","response":"","answer":"","answerElement":"","solved":false})
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

                                questions[x].question = questionTextChild.innerText
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
                                        answerElements.push(answer)
                                        answerText.push(text)
                                    }
                                })
                                questions[x].answers = answerText
                                questions[x].answerElements = answerElements
                            }
                        }
                    }
                })
            }
        })
        questions[x].prompt = questions[x].question + "\n" + questions[x].answers.join("\n") + "\n"
    };
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
    for(var i = 0; i < potentialAnswers.length; i++){
        var answerWords = potentialAnswers[i].toLowerCase().replace(/[^A-Za-z0-9\s]/g,'').split(" ")
        var matchCount = 0
        for(var x = 0; x < answerWords.length;x++){
            if(response.toLowerCase().replace(/[^A-Za-z0-9\s]/g,'').includes(answerWords[x])){
                matchCount++
            }
        }
        var score = matchCount/answerWords.length
        if (score > bestScore){
            bestScore = score
            bestIndex = i
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

async function saveData(){
    console.log("SAVING DATA")
    chrome.storage.local.set({[url]:questions})
}


async function autoSolveQuestions(){
    for(var i = 0; i < questions.length;i++){
        chrome.runtime.sendMessage({
            msg: "progress", 
            data: {
                subject: "AutoSolveProgress",
                content: i + 1
            }
        });
        if(questions[i].solved) continue
        const response = await sendPromptToAI(questions[i]["prompt"])
        if(response.error) {
            return
        }
        const answer = await parseAIResponse(response.choices[0].text,questions[i]["answers"])
        questions[i].answer = answer
        questions[i].response = response
        questions[i].solved = true;
        console.log("Question " + (i+1) + " Answer: " + answer)
    }
}

function scrapeTest(){
    return parseCanvasMultipleChoice()
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(JSON.stringify(request))
    if(!request) return
    if(request["type"] == "function"){
        if(request["data"] == "scrape"){
            (async () => {
                await scrapeTest()
                await saveData()
                sendResponse({"type":"scrapeData","data":questions})
            })();
            return true
        }
        else if(request["data"] == "autoSolve"){
            (async () => {
                await autoSolveQuestions()
                await saveData()
                sendResponse({"type":"autoSolveData","data":questions})
            })();
            return true
        }
    } else if(request["type"] == "updateData"){
        if(request["data"] == "keyChange"){
            api_key = request["api_key"]
            return true
        } else if(request["data"] == "highlightChange"){
            highlightCorrectQuestions = request["highlightCorrectQuestions"]
            return true
        }
    }
})
