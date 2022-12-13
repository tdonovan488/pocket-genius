var api_key = "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"
var MODEL = "text-davinci-003"
var highlightCorrectQuestions = false;

const clarifyAnswers = false;

var questions;

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
                                        answerElements.push(answer)
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
    return questions
}


async function sendPromptToAI(prompt){
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


async function autoSolveQuestions(){
    var responseFilled = questions
    for(var i = 0; i < questions.questionCount;i++){
        const response = await sendPromptToAI(questions.questions[i]["prompt"])
        const answer = await parseAIResponse(response.choices[0].text,questions.questions[i]["answers"])
        responseFilled.questions[i].answer = answer
        responseFilled.questions[i].response = response
        if(answer && highlightCorrectQuestions){
            questions.questions[i]["answerElements"][questions.questions[i].answers.indexOf(answer)].style = "background-color: #90EE90;";
        }
        console.log("Question " + (i+1) + " Answer: " + answer)
    }
    return responseFilled
}

function scrapeTest(){
    return parseCanvasMultipleChoice()
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
    } else if(request["type"] == "startup"){
        api_key = request["data"]["api_key"]
        highlightCorrectQuestions = request["data"]["highlightCorrectQuestions"]

    } else if(request["type"] == "updateData"){
        if(request["data"] == "keyChange"){
            api_key = request["api_key"]
        } else if(request["data"] == "highlightChange"){
            highlightCorrectQuestions = request["highlightCorrectQuestions"]
        }
    }
})