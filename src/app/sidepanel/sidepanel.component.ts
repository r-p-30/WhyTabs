import { Component, NgZone, OnInit } from '@angular/core';
import { SavedTab } from '../model/savedTab.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidepanel',
  imports: [CommonModule],
  templateUrl: './sidepanel.component.html',
  styleUrl: './sidepanel.component.css',
})
export class SidepanelComponent implements OnInit {
  allSavedTabs: SavedTab[] = [];
  savedTabs: SavedTab[] = [];
  availableTags: string[] = [];
  selectedFilterTags: string[] = [];
  filterReadStatus: 'all' | 'read' | 'unread' = 'all';
  sidePanelSearchText: string = '';
  isFiltersCollapsed = true;

  constructor(readonly ngZone: NgZone) { }



  ngOnInit() {
    console.log("init")
    this.renderTabs();

    // Notify background that sidepanel is open
    chrome.runtime.connect({ name: 'sidepanel' });

    // Listen for storage changes to refresh tabs automatically
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (changes['tabs'])) {
        this.ngZone.run(() => {
          this.renderTabs();
        });
      }
    });
  }

  renderTabs() {
    chrome.storage.sync.get(['tabs'], (result: { tabs?: any[] }) => {
      this.ngZone.run(() => {
        const tabs = (result['tabs'] ?? [])
          .filter((t: any) => t.is_active);

        // Custom Sort: Unread first, then by date (newest first)
        this.allSavedTabs = tabs.sort((a, b) => {
          if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
          const dateA = new Date(a.savedAt).getTime();
          const dateB = new Date(b.savedAt).getTime();
          return dateB - dateA;
        });

        this.updateAvailableTags();
        this.applyFilters();
      });
    });
  }



  updateAvailableTags() {
    const tags = new Set<string>();
    this.allSavedTabs.forEach(tab => {
      if (tab.tags) tab.tags.forEach(tag => tags.add(tag));
    });
    this.availableTags = Array.from(tags).sort();
  }

  applyFilters() {
    this.savedTabs = this.allSavedTabs.filter(tab => {
      // Status filter
      if (this.filterReadStatus === 'read' && !tab.is_read) return false;
      if (this.filterReadStatus === 'unread' && tab.is_read) return false;

      // Tags filter
      if (this.selectedFilterTags.length > 0) {
        const hasTag = tab.tags?.some(tag => this.selectedFilterTags.includes(tag));
        if (!hasTag) return false;
      }

      // Search filter
      if (this.sidePanelSearchText) {
        const search = this.sidePanelSearchText.toLowerCase();
        return tab.title.toLowerCase().includes(search) || (tab.intent && tab.intent.toLowerCase().includes(search));
      }

      return true;
    });
  }

  toggleFilterTag(tag: string) {
    if (this.selectedFilterTags.includes(tag)) {
      this.selectedFilterTags = this.selectedFilterTags.filter(t => t !== tag);
    } else {
      this.selectedFilterTags.push(tag);
    }
    this.applyFilters();
  }

  setStatusFilter(status: 'all' | 'read' | 'unread') {
    this.filterReadStatus = status;
    this.applyFilters();
  }

  onSearchChange(event: any) {
    this.sidePanelSearchText = event.target.value;
    this.applyFilters();
  }

  toggleFilters() {
    this.isFiltersCollapsed = !this.isFiltersCollapsed;
  }

  clearFilters() {
    this.sidePanelSearchText = '';
    this.filterReadStatus = 'all';
    this.selectedFilterTags = [];
    this.applyFilters();
  }

  toggleIsRead(tab: any) {
    tab.is_read = !tab.is_read;
    this.updateTabInStorage(tab, () => {
      this.renderTabs();
    });
  }

  deactivateTab(tab: any) {
    tab.is_active = false;
    this.updateTabInStorage(tab, () => {
      this.renderTabs();
    });
  }

  updateTabInStorage(tab: any, callback: () => void) {
    chrome.storage.sync.get(['tabs'], (result: { tabs?: any[] }) => {
      const tabs = result['tabs'] || [];
      const index = tabs.findIndex((t) => t.id === tab.id);
      if (index !== -1) {
        tabs[index] = tab;
        chrome.storage.sync.set({ tabs }, callback);
      }
    });
  }

  exportData() {
    chrome.storage.sync.get(['tabs'], (result) => {
      const data = JSON.stringify(result['tabs'] || [], null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whytabs_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  importData(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const tabs = JSON.parse(e.target.result);
        if (Array.isArray(tabs)) {
          chrome.storage.sync.set({ tabs }, () => {
            this.ngZone.run(() => {
              this.renderTabs();
              alert('Data imported successfully!');
            });
          });
        }
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
  }




}
