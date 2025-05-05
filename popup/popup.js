document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveBtn");
  const intentInput = document.getElementById("intent");
  const readSwitchWrapper = document.getElementById("readSwitchWrapper");
  const readSwitch = document.getElementById("readSwitch");

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.storage.sync.get(["tabs"], (result) => {
      const tabs = result.tabs || [];
      const matchedTab = tabs.find(
        (t) => t.url === tab.url && t.is_active == true
      );
      console.log(matchedTab, "matchedTab")
      if (matchedTab) {
        saveBtn.disabled = true;
        intentInput.disabled = true;
        saveBtn.title = "This tab is already saved";
        console.log(matchedTab)
        if (!matchedTab.is_read) {
          // Show and initialize read switch
          readSwitchWrapper.style.display = "inline-block";
          readSwitch.checked = matchedTab.is_read;

          // Handle marking as read
          readSwitch.addEventListener("change", () => {
            matchedTab.is_read = true;
            updateTabInStorage(matchedTab, () => {
              const statusEl = document.getElementById("status");
              statusEl.textContent = "Marked as read!";
              statusEl.style.color = "blue";
              setTimeout(() => (statusEl.textContent = ""), 3000);
            });
          });
        }
      } else {
        saveBtn.disabled = false;
        saveBtn.title = "Save this tab";
        intentInput.disabled = false;
        saveBtn.addEventListener("click", () => saveTab(tab));
      }
    });
  });
});

function updateTabInStorage(tab, callback) {
  chrome.storage.sync.get(["tabs"], (result) => {
    const tabs = result.tabs || [];
    const index = tabs.findIndex((t) => t.id === tab.id);
    if (index !== -1) {
      tabs[index] = tab;
      chrome.storage.sync.set({ tabs }, callback);
    }
  });
}

function saveTab(tab) {
  const intent = document.getElementById("intent").value.trim();
  const statusEl = document.getElementById("status");
  if (!intent) return;

  chrome.storage.sync.get(["tabs"], (result) => {
    const tabs = result.tabs || [];
    console.log(tab)
    tabs.push({
      id: `${tab.id}_${Date.now()}`,
      url: tab.url,
      title: tab.title,
      intent: intent,
      is_read: false,
      is_active: true,
      savedAt: new Date().toISOString(),
    });

    chrome.storage.sync.set({ tabs }, () => {
      document.getElementById("intent").value = "";
      statusEl.textContent = "Saved successfully! Open side panel to view.";
      statusEl.style.color = "green";

      // Optionally disable after save
      document.getElementById("saveBtn").disabled = true;
      document.getElementById("intent").disabled = true;

      setTimeout(() => (statusEl.textContent = ""), 4000);
    });
  });
}
