var questionContianer = document.querySelector("#questions");

var KEY = "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"
const MODEL = "text-davinci-003"

var autoSolve = true;

chrome.storage.local.get(["api_key","auto_solve_enabled"]).then((result) => {
    console.log("API KEY: " + result.api_key)
    console.log("AUTO SOLVE ENABLED: " + Boolean(result.auto_solve_enabled))
    api_key_input.value = result.api_key;
    auto_solve_enabled = Boolean(result.auto_solve_enabled);
});


var questionsElements = []
for(var i = 0; i < questionContianer.children.length;i++){
    var child = questionContianer.children[i];
    if(child.ariaLabel == "Question"){
        questionsElements.push(child);
    }
}


function parseCanvasMultipleChoice(){
    var questions = {"questionCount":questionsElements.length}
    for(var x = 0; x < questionsElements.length; x++){
        questions[x] = {"question":"","answers":[],"prompt":"","response":"","answer":""}
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
                                answerWrapper.forEach(answer =>{
                                    if(answer.className != "clear"){
                                        try{
                                            var text = answer.children[1].children[1].children[0].innerText
                                            if(!text){
                                                text = answer.children[1].children[1].children[1].children[0].innerText
                                            }
                                        } catch{}

                                        answerText.push(text)
                                    }
                                })
                                questions[x].answers = answerText
                            }
                        }
                    }
                })
            }
        })
        questions[x].prompt = questions[x].question + "\n" + questions[x].answers.join("\n") + "\n"
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
            return answers[i]
        }
    }
    
    return null
}


async function autoSolveQuestions(){
    for(var i = 0; i < questions.questionCount;i++){
        const response = await sendPromptToAI(questions[i]["prompt"])
        const answer = await parseAIResponse(response.choices[0].text)
        questions[i].answer = answer
        if(answer != null){

        }
    }
}


var questions = parseCanvasMultipleChoice()



// console.log(JSON.stringify(questions))

// for(var i = 0; i < questions.questionCount;i++){
//     console.log(questions[i].prompt)
// }