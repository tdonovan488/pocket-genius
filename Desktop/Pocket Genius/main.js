const KEY = "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"
const MODEL = "text-davinci-003"

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function parseCanvasMultipleChoice(){
    const questionContainer = getElementByXpath("/html/body/div[3]/div[2]/div[2]/div/div[1]/div/div/div[2]/div[5]")

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
                                    if(answer.className != "clear"){
                                        try{
                                            var text = answer.children[1].children[1].children[0].innerText
                                            if(!text){
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
    return questions
}

async function sendPromptToAI(prompt){
    const response = await fetch("https://api.openai.com/v1/completions",{
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + KEY
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
        if(text.toLowerCase().includes(answers[i].toLowerCase())){
            var previousText = text.toLowerCase().split(answers[i].toLowerCase())[0]
            for(var x = 0; x < answers.length;x++){
                if(previousText.includes(answers[x].toLowerCase())){
                    return answers[x]
                }
            }
            return answers[i]
        }
    }

    return await askForClarification(text,answers)
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
    for(var i = 0; i < questions.questionCount;i++){
        const response = await sendPromptToAI(questions.questions[i]["prompt"])
        const answer = await parseAIResponse(response.choices[0].text,questions.questions[i]["answers"])
        questions.questions[i].answer = answer
        questions.questions[i].response = response
        if (answer){
            questions.questions[i]["answerElements"][questions.questions[i].answers.indexOf(answer)].style = "background-color: #90EE90;";
        }
        console.log("Question " + (i+1) + " Answer: " + answer)
    }
}

var questions = parseCanvasMultipleChoice()
autoSolveQuestions()

