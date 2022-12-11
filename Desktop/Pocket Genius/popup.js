var auto_solve_enabled = false;
chrome.storage.local.get(["api_key","auto_solve_enabled"]).then((result) => {
    console.log("API KEY: " + result.api_key)
    console.log("AUTO SOLVE ENABLED: " + Boolean(result.auto_solve_enabled))
    api_key_input.value = result.api_key;
    auto_solve_enabled = Boolean(result.auto_solve_enabled);


    auto_solve_toggle.className = auto_solve_enabled  ? "slider round enabled" : "slider round"
});



const api_key_input = document.querySelector("body > div > div:nth-child(5) > div > div.options > div:nth-child(1) > div.switchcontainer > input")
api_key_input.addEventListener("change",function(){
    console.log("API KEY: " + api_key_input.value)
    chrome.storage.local.set({ "api_key": api_key_input.value })
})

const auto_solve_input = document.querySelector("#auto-solve")
const auto_solve_toggle = document.querySelector("body > div > div:nth-child(5) > div > div.options > div:nth-child(3) > div.switchcontainer > label > span")

auto_solve_input.addEventListener("click",function(){
    auto_solve_enabled = !auto_solve_enabled
    console.log("AUTO SOLVE ENABLED: " + auto_solve_enabled)
    chrome.storage.local.set({"auto_solve_enabled": auto_solve_enabled})
    auto_solve_toggle.className =  auto_solve_enabled  ? "slider round enabled" : "slider round"
})