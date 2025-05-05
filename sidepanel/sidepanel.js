document.addEventListener('DOMContentLoaded', () => {
  // Load the saved tabs from chrome storage
  renderTabs();
});

function renderTabs() {
  chrome.storage.sync.get(["tabs"], (result) => {
    const tabs = result.tabs || [];
    console.log(tabs)
    const list = document.getElementById('tabList');
    list.innerHTML = "";

    tabs.slice().reverse().filter(tab => tab.is_active).forEach(tab => {
      const item = document.createElement('div');
      item.className = 'tab-item';

      // Title
      const titleLink = document.createElement('a');
      titleLink.href = tab.url;
      titleLink.target = '_blank';
      titleLink.className = 'tab-title';
      titleLink.textContent = tab.title;

      // Notes
      const notes = document.createElement('div');
      notes.className = 'tab-notes';
      notes.textContent = tab.intent;

      // Meta
      const meta = document.createElement('div');
      meta.className = 'tab-meta';
      meta.textContent = new Date(tab.savedAt).toLocaleString();

      // isRead switch
      const isReadSwitch = document.createElement('label');
      isReadSwitch.className = 'switch';

      const switchInput = document.createElement('input');
      switchInput.type = 'checkbox';
      switchInput.checked = tab.is_read;
      switchInput.addEventListener('change', () => toggleIsRead(tab));

      const switchSlider = document.createElement('span');
      switchSlider.className = 'slider';

      isReadSwitch.appendChild(switchInput);
      isReadSwitch.appendChild(switchSlider);
      isReadSwitch.title = 'Mark as read/unread';

      // Cross icon
      const crossIcon = document.createElement('span');
      crossIcon.className = 'cross-icon';
      crossIcon.innerHTML = '&#10006;';
      crossIcon.title = 'Archive';
      crossIcon.addEventListener('click', () => deactivateTab(tab));
      
      const tabHeader = document.createElement('div');
      tabHeader.className = 'tab-header';

      // Actions container
      const tabActions = document.createElement('div');
      tabActions.className = 'tab-actions';
      tabActions.appendChild(isReadSwitch);
      tabActions.appendChild(crossIcon);

      tabHeader.appendChild(titleLink);
      tabHeader.appendChild(tabActions);

      // Append all
      item.appendChild(tabHeader);
      item.appendChild(notes);
      item.appendChild(meta);

      list.appendChild(item);
    });
  });
}

function toggleIsRead(tab) {
  console.log(tab, "before update")
  tab.is_read = !tab.is_read;
  console.log(tab)
  updateTabInStorage(tab, () => {
    renderTabs();
  });
}

function deactivateTab(tab) {
  tab.is_active = false;

  updateTabInStorage(tab, () => {
    renderTabs();
  });
}

function updateTabInStorage(tab, callback) {
  chrome.storage.sync.get(["tabs"], (result) => {
    const tabs = result.tabs || [];
    const index = tabs.findIndex(t => t.id === tab.id);
    if (index !== -1) {
      tabs[index] = tab;
      chrome.storage.sync.set({ tabs }, callback);
    }
  });
}
