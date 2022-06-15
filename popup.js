document.getElementById("generate").addEventListener("click", () => {
    chrome.runtime.sendMessage({ "message" : "generate" });
});