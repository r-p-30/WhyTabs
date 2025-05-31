import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Tab } from '../model/tab.interface';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-popup',
  imports: [ReactiveFormsModule, CommonModule, MatSlideToggleModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.css',
  standalone: true
})
export class PopupComponent {
  form: FormGroup;
  isSaved = false;
  showReadSwitch = false;
  tooltipMsg = '';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      intent: [''],
      // read: [false]
    });
  }

  ngOnInit(): void {
    this.loadCurrentTabInfo();
  }

  queryActiveTab(): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0]);
      });
    });
  }

  storageGet(keys: string[]): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  storageSet(items: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, () => {
        resolve();
      });
    });
  }

  async loadCurrentTabInfo() {
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: Tab) => t.url === tab.url && t.is_active);

    if (matchedTab) {
      this.isSaved = true;
      this.showReadSwitch = !matchedTab.isRead;
      this.form.disable();
      this.tooltipMsg = matchedTab.isRead ? 'This tab is already marked as read.' : 'This tab is already saved.';
      this.form.patchValue({
        intent: matchedTab.intent ?? '',
        // read: matchedTab.is_read,
      });
    } else {
      this.isSaved = false;
      this.form.enable();
      this.showReadSwitch = false;
      this.tooltipMsg = '';
    }
  }

  async saveTab(): Promise<void> {
    const intent = this.form.value.intent.trim();
    if (!intent) return;

    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs || [];

    // Prevent duplicate save
    const alreadySaved = tabs.some((t: Tab) => t.url === tab.url && t.is_active);
    if (alreadySaved) return;

    tabs.push({
      id: `${tab.id}_${Date.now()}`,
      url: tab.url,
      title: tab.title,
      intent,
      is_read: false,
      is_active: true,
      savedAt: new Date().toISOString(),
    });

    await this.storageSet({ tabs });

    this.isSaved = true;
    this.showReadSwitch = true;
    this.form.disable();
    this.tooltipMsg = 'Saved successfully! Open side panel to view.';
  }

  async markAsRead(): Promise<void> {
    console.log("1");
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: Tab) => t.url === tab.url && t.is_active);
    console.log("2", matchedTab);
    if (!matchedTab) return;

    matchedTab.is_read = !matchedTab.is_read;
    const index = tabs.findIndex((t: Tab) => t.id === matchedTab.id);
    console.log("3", index);
    if (index !== -1) tabs[index] = matchedTab;

    await this.storageSet({ tabs });

    this.showReadSwitch = false;
    this.tooltipMsg = 'Marked as read!';
  }
}
