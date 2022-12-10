var questionContianer = document.querySelector("#questions");


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
        questions[x] = {"question":"","answers":[],"questionString":""}
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
        questions[x].questionString = questions[x].question + "\n" + questions[x].answers.join("\n") + "\n"
    };
    return questions
}

var questions = parseCanvasMultipleChoice()
console.log(questions)

for(var i = 0; i < questions.questionCount;i++){
    console.log(questions[i].questionString)
}