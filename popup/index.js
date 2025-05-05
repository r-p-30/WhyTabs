document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const intentInput = document.getElementById('intent');

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.storage.sync.get(["tabs"], (result) => {
      const tabs = result.tabs || [];
      const alreadySaved = tabs.some(t => t.id === tab.id && t.is_active == true);

      if (alreadySaved) {
        saveBtn.disabled = true;
        intentInput.disabled = true;
        saveBtn.title = "This tab is already saved";
      } else {
        saveBtn.disabled = false;
        saveBtn.title = "Save this tab";
        intentInput.disabled = false;
        saveBtn.addEventListener('click', () => saveTab(tab));
      }
    });
  });
});



function saveTab(tab) {
  const intent = document.getElementById('intent').value.trim();
  const statusEl = document.getElementById('status');
  if (!intent) return;

  chrome.storage.sync.get(["tabs"], (result) => {
    const tabs = result.tabs || [];

    tabs.push({
      id:`${tab.tabId}_${Date.now()}`,
      url: tab.url,
      title: tab.title,
      intent: intent,
      is_read: true,
      is_active: true,
      savedAt: new Date().toISOString()
    });

    chrome.storage.sync.set({ tabs }, () => {
      document.getElementById('intent').value = "";
      statusEl.textContent = "Saved successfully! Open side panel to view.";
      statusEl.style.color = "green";

      // Optionally disable after save
      document.getElementById('saveBtn').disabled = true;
      document.getElementById('intent').disabled = true;

      setTimeout(() => statusEl.textContent = "", 4000);
    });
  });
}

