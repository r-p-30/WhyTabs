let isSidePanelOpen = false;

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-sidepanel") {
      // Get the active tab to retrieve the windowId
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]; // Get the active tab
        if (tab) {
          // Open the side panel in the current window and tab
          chrome.sidePanel.open({ windowId: tab.windowId, tabId: tab.id }, () => {
            console.log("Side panel opened successfully");
          });
        } else {
          console.error("No active tab found.");
        }
      });
    }
  });
