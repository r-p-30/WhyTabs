import { Component, OnInit, HostListener, ElementRef} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tab } from '../model/tab.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.css',
  host: { '[class.fade-out]': 'isFadingOut' }
})
export class PopupComponent implements OnInit {
  form: FormGroup;
  showReadSwitch = false;
  tooltipMsg = '';
  availableTags: string[] = ['Work', 'Personal', 'Research', 'Reading', 'Learning', 'Important', 'Later'];
  isDropdownOpen = false;
  selectedReminderShortcut: 'tomorrow' | 'nextWeek' | null = null;
  isFadingOut: boolean = false;

  constructor(private fb: FormBuilder, private el: ElementRef) {
    this.form = this.fb.group({
      intent: ['', Validators.required],
      tags: [[]],
      reminderDate: [''],
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

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.el.nativeElement.querySelector('.dropdown').contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  async loadCurrentTabInfo() {
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: Tab) => t.url === tab.url && t.is_active);

    if (matchedTab) {
      this.showReadSwitch = !matchedTab.is_read;
      this.form.patchValue({
        intent: matchedTab.intent ?? '',
        tags: matchedTab.tags ?? [],
        reminderDate: matchedTab.reminderAt ? new Date(matchedTab.reminderAt).toISOString().split('T')[0] : ''
      });

      if (matchedTab.reminderAt) {
        const reminderDate = new Date(matchedTab.reminderAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        // Check if reminder is exactly tomorrow or next week at 11 AM
        if (reminderDate.toDateString() === tomorrow.toDateString() && reminderDate.getHours() === 11) {
          this.selectedReminderShortcut = 'tomorrow';
        } else if (reminderDate.toDateString() === nextWeek.toDateString() && reminderDate.getHours() === 11) {
          this.selectedReminderShortcut = 'nextWeek';
        } else {
          this.selectedReminderShortcut = null;
        }
      } else {
        this.selectedReminderShortcut = null;
      }
    } else {
      this.form.enable();
      this.showReadSwitch = false;
      this.tooltipMsg = '';
      this.selectedReminderShortcut = null;
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onTagChange(event: any): void {
    const selectedTags = this.form.get('tags')?.value as string[];
    const tag = event.target.value;

    if (event.target.checked) {
      this.form.get('tags')?.setValue([...selectedTags, tag]);
    } else {
      this.form.get('tags')?.setValue(selectedTags.filter(t => t !== tag));
    }
  }

  async saveTab(): Promise<void> {
    const { intent, tags, reminderDate } = this.form.value;
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];

    let reminderAt: string | null = null;
    if (reminderDate) {
        reminderAt = `${reminderDate}T11:00:00`;
    }
    
    const existingTabIndex = tabs.findIndex((t: Tab) => t.url === tab.url && t.is_active);
    if (existingTabIndex !== -1) {
      tabs[existingTabIndex] = {
        ...tabs[existingTabIndex],
        url: tab.url,
        title: tab.title,
        intent,
        tags,
        is_read: tabs[existingTabIndex].is_read,
        is_active: true,
        savedAt: new Date().toISOString(),
        reminderAt
      };
      this.tooltipMsg = 'Tab updated successfully!';
    }else{
      tabs.push({
        id: `${tab.id}_${Date.now()}`,
        url: tab.url,
        title: tab.title,
        intent,
        tags,
        is_read: false,
        is_active: true,
        savedAt: new Date().toISOString(),
        reminderAt
      });
      this.tooltipMsg = 'Saved successfully! Open side panel to view.';
    }

    await this.storageSet({ tabs });
    this.showReadSwitch = true;
    this.startFadeOut();
  }

  setReminderShortcut(type: 'tomorrow' | 'nextWeek'): void {
    const today = new Date();
    const reminder = new Date(today);
    reminder.setHours(11, 0, 0, 0);

    if (type === 'tomorrow') {
      reminder.setDate(today.getDate() + 1);
    } else if (type === 'nextWeek') {
      reminder.setDate(today.getDate() + 7);
    }

    const year = reminder.getFullYear();
    const month = (reminder.getMonth() + 1).toString().padStart(2, '0');
    const day = reminder.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    this.form.patchValue({
      reminderDate: formattedDate
    });

    this.selectedReminderShortcut = type;
  }

  async markAsRead(): Promise<void> {
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: Tab) => t.url === tab.url && t.is_active);

    if (!matchedTab) return;

    matchedTab.is_read = !matchedTab.is_read;
    const index = tabs.findIndex((t: Tab) => t.id === matchedTab.id);
    if (index !== -1) tabs[index] = matchedTab;

    await this.storageSet({ tabs });

    this.showReadSwitch = false;
    this.tooltipMsg = matchedTab.is_read ? 'Marked as read!' : 'Marked as unread!';
  }

  private startFadeOut(): void {
    this.isFadingOut = true;
    const fadeDurationMs = 2000;
    const el = this.el.nativeElement;
    const handleTransitionEnd = () => {
      el.removeEventListener('transitionend', handleTransitionEnd);
      window.close();
    };

    el.addEventListener('transitionend', handleTransitionEnd);
    setTimeout(() => {
      if (this.isFadingOut) {
        window.close();
      }
    }, fadeDurationMs + 50);
  }
}