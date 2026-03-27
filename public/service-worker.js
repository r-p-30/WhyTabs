let sidePanelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
      console.log("Side panel closed");
    });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "open-sidepanel") {
    if (sidePanelPort) {
      // It's open. The trick to close it is to set it as disabled temporarily for all tabs.
      console.log("Closing side panel via shortcut toggle");
      chrome.sidePanel.setOptions({ enabled: false }, () => {
        // Re-enable immediately so it can be opened next time.
        chrome.sidePanel.setOptions({ enabled: true });
      });
    } else {
      // It's closed. Open it.
      if (tab && tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }, () => {
          console.log("Side panel opened via shortcut");
        });
      }
    }
  } else if (command === "open-popup") {
    if (tab && tab.windowId) {
      // We try to open the popup. If it fails due to window focus, we ignore or log.
      // openPopup() returns a promise and is highly sensitive to the exact timing of the user gesture.
      chrome.action.openPopup({ windowId: tab.windowId }).catch((e) => {
        console.log("Popup state error (ignoring):", e);
      });
    } else {
      chrome.action.openPopup().catch(() => { });
    }
  }
});

// --- Reminder Notification Logic ---

const NOTIFICATION_PREFIX = "whytab_reminder_";
let notifiedThisSession = new Set(); // Keep track of notifications shown to avoid spamming

function checkReminders() {
  chrome.storage.sync.get(['tabs'], (result) => {
    const tabs = result['tabs'] || [];
    const now = new Date();

    tabs.forEach(tab => {
      // Check if it is active, unread, and has a reminder date
      if (tab.is_active && !tab.is_read && tab.reminderAt) {
        const reminderDate = new Date(tab.reminderAt);
        // Truncate both to start of the day to trigger purely on date
        const todayZero = new Date(now.toDateString());
        const remZero = new Date(reminderDate.toDateString());

        // If the reminder date is today or in the past
        if (remZero.getTime() <= todayZero.getTime()) {
          const notificationId = NOTIFICATION_PREFIX + tab.id;

          if (!notifiedThisSession.has(notificationId)) {
            // Create a notification
            chrome.notifications.create(notificationId, {
              type: "basic",
              iconUrl: "assets/icon-32.png", // Ensure this path matches the built extension
              title: "WhyTabs Reminder",
              message: `Time to read: ${tab.title}`,
              buttons: [
                { title: "Snooze 1 Day" },
                { title: "Mark as Read" }
              ],
              requireInteraction: true
            }, (createdId) => {
              if (chrome.runtime.lastError) {
                console.error("Notification error:", chrome.runtime.lastError);
              } else {
                notifiedThisSession.add(notificationId);
              }
            });
          }
        }
      }
    });
  });
}

// Trigger check on startup
chrome.runtime.onStartup.addListener(() => {
  checkReminders();
});

// Also perform an initial check when the extension is installed/reloaded
chrome.runtime.onInstalled.addListener(() => {
  checkReminders();
});

// Setup alarm to run periodically (cron style)
chrome.alarms.get("checkRemindersAlarm", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("checkRemindersAlarm", { periodInMinutes: 60 }); // check every 30 mins just in case
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkRemindersAlarm") {
    checkReminders();
  }
});

// Handle dismissals (close without action). Remove from session so it can respawn later!
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  if (byUser && notificationId.startsWith(NOTIFICATION_PREFIX)) {
    notifiedThisSession.delete(notificationId);
  }
});

// Handle notification button clicks (Snooze or Mark as Read)
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith(NOTIFICATION_PREFIX)) {
    const tabId = notificationId.replace(NOTIFICATION_PREFIX, "");

    chrome.storage.sync.get(['tabs'], (result) => {
      const tabs = result['tabs'] || [];
      const tIndex = tabs.findIndex(t => t.id === tabId);

      if (tIndex !== -1) {
        let tab = tabs[tIndex];

        if (buttonIndex === 0) {
          // Button 1: Snooze for 1 day
          let newReminder = new Date();
          newReminder.setDate(newReminder.getDate() + 1);
          tab.reminderAt = newReminder.toISOString();
          console.log(`Snoozed tab reminder ${tabId} for 1 day`);
        } else if (buttonIndex === 1) {
          // Button 2: Mark as Read
          tab.is_read = true;
          console.log(`Marked tab ${tabId} as read from notification`);
        }

        tabs[tIndex] = tab;
        chrome.storage.sync.set({ tabs }, () => {
          // Clear notification
          chrome.notifications.clear(notificationId);
          // If snoozed, remove from session cache so the new date will trigger again if needed
          if (buttonIndex === 0) {
            notifiedThisSession.delete(notificationId);
          }
        });
      } else {
        // Tab no longer exists, just clear
        chrome.notifications.clear(notificationId);
      }
    });
  }
});

// Optional: Open the tab when clicking on the notification body
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith(NOTIFICATION_PREFIX)) {
    const tabId = notificationId.replace(NOTIFICATION_PREFIX, "");
    chrome.storage.sync.get(['tabs'], (result) => {
      const tabs = result['tabs'] || [];
      const tab = tabs.find(t => t.id === tabId);
      if (tab && tab.url) {
        chrome.tabs.create({ url: tab.url });
      }
      chrome.notifications.clear(notificationId);
    });
  }
});
