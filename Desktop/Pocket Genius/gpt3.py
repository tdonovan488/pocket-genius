import requests,json

KEY = "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"
MODEL = "text-davinci-003"

questions = {"0":{"question":"Any income, property, good, or service on which people pay a tax is called     a(n):","answers":["Tax base","Tax rate","Sales tax","Expenditure"],"prompt":"Any income, property, good, or service on which people pay a tax is called     a(n):\nTax base\nTax rate\nSales tax\nExpenditure\n"},"1":{"question":"Federal income tax is a:","answers":["regressive tax","progressive tax","proportional tax","discretionary tax"],"prompt":"Federal income tax is a:\nregressive tax\nprogressive tax\nproportional tax\ndiscretionary tax\n"},"2":{"question":"Which of the following would be considered a progressive tax?","answers":["People making $35,000 pay a 10% tax, while people earning $100,000 pay a 30% tax","People pay a 10% tax on property whether it's worth $5,000 or $50,000","All individuals pay a 15% income tax","All individuals pay a 5% sales tax"],"prompt":"Which of the following would be considered a progressive tax?\nPeople making $35,000 pay a 10% tax, while people earning $100,000 pay a 30% tax\nPeople pay a 10% tax on property whether it's worth $5,000 or $50,000\nAll individuals pay a 15% income tax\nAll individuals pay a 5% sales tax\n"},"3":{"question":"A tax is fair when the individual paying the tax is rewarded from the service the tax helps provide.  This is called:","answers":["right to work principle","ability to pay principle","benefits received principle","tax the wealthy principle"],"prompt":"A tax is fair when the individual paying the tax is rewarded from the service the tax helps provide.  This is called:\nright to work principle\nability to pay principle\nbenefits received principle\ntax the wealthy principle\n"},"questionCount":4}

for i in range(questions["questionCount"]):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {KEY}"
    }
    data = {
        "model":MODEL,
        "prompt":questions[str(i)]["prompt"],
        "temperature":0,
        "max_tokens":50,
    }
    
    r = requests.post("https://api.openai.com/v1/completions",headers=headers,json=data)
    print(f"-------------------------------QUESTION {str(i+1)}---------------------------------")
    print(r.text,"\n")
    j = json.loads(r.text)
    print(questions[str(i)]["prompt"],"\n")
    response = j["choices"][0]["text"]
    print("AI Response",response,"\n")

    for x in questions[str(i)]["answers"]:
        if x.lower().rstrip() in response.lower():
            print("AI Thinks The Answer Is:",x,"<--------------------------ANSWER-----------------------------")
            break
    else:
        print("AI Is Unsure")