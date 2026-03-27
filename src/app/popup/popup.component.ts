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
  filteredTags: string[] = [];
  isDropdownOpen = false;
  selectedReminderShortcut: 'tomorrow' | 'nextWeek' | null = null;
  isFadingOut: boolean = false;
  tagSearchText: string = '';

  constructor(private fb: FormBuilder, private el: ElementRef) {


    this.form = this.fb.group({
      intent: ['', Validators.required],
      tags: [[]],
      reminderDate: [''],
      is_read: [false]
    });
    this.filteredTags = [...this.availableTags];
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
    const dropdown = this.el.nativeElement.querySelector('.dropdown');
    if (dropdown && !dropdown.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  async loadCurrentTabInfo() {
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: any) => t.url === tab.url && t.is_active);


    if (matchedTab) {
      this.showReadSwitch = true;
        let reminderDateStr = '';
        if (matchedTab.reminderAt) {
          const dateObj = new Date(matchedTab.reminderAt);
          const d = dateObj.getDate().toString().padStart(2, '0');
          const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const y = dateObj.getFullYear();
          reminderDateStr = `${d}/${m}/${y}`;
        }

        this.form.patchValue({
          intent: matchedTab.intent ?? '',
          tags: matchedTab.tags ?? [],
          reminderDate: reminderDateStr,
        is_read: matchedTab.is_read ?? false
      });



      if (matchedTab.reminderAt) {
        const reminderDate = new Date(matchedTab.reminderAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

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

  toggleDropdown(open?: boolean): void {
    this.isDropdownOpen = open !== undefined ? open : !this.isDropdownOpen;
  }

  onTagSearch(event: any): void {
    this.tagSearchText = event.target.value;
    this.filteredTags = this.availableTags.filter(tag => 
      tag.toLowerCase().includes(this.tagSearchText.toLowerCase())
    );
    this.isDropdownOpen = true;
  }

  addTag(tag: string): void {
    const selectedTags = this.form.get('tags')?.value as string[];
    if (!selectedTags.includes(tag)) {
      this.form.get('tags')?.setValue([...selectedTags, tag]);
    }
    this.tagSearchText = '';
    this.filteredTags = [...this.availableTags];
    this.isDropdownOpen = false;
  }

  removeTag(tag: string): void {
    const selectedTags = this.form.get('tags')?.value as string[];
    this.form.get('tags')?.setValue(selectedTags.filter(t => t !== tag));
  }

  handleTagInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.tagSearchText.trim()) {
      event.preventDefault();
      this.addTag(this.tagSearchText.trim());
    }
  }

  async saveTab(): Promise<void> {
    const { intent, tags, reminderDate } = this.form.value;
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];


    let reminderAt: string | null = null;
    if (reminderDate) {
      if (reminderDate.includes('/')) {
        const [d, m, y] = reminderDate.split('/');
        reminderAt = `${y}-${m}-${d}T11:00:00`;
      } else {
        reminderAt = `${reminderDate}T11:00:00`;
      }
    }

    const existingTabIndex = tabs.findIndex((t: any) => t.url === tab.url && t.is_active);
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
    } else {
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
    const formattedDate = `${day}/${month}/${year}`;

    this.form.patchValue({
      reminderDate: formattedDate
    });

    this.selectedReminderShortcut = type;
  }

  async markAsRead(): Promise<void> {
    const tab = await this.queryActiveTab();
    const result = await this.storageGet(['tabs']);
    const tabs = result.tabs ?? [];
    const matchedTab = tabs.find((t: any) => t.url === tab.url && t.is_active);


    if (!matchedTab) return;

    matchedTab.is_read = !matchedTab.is_read;
    const index = tabs.findIndex((t: any) => t.id === matchedTab.id);
    if (index !== -1) tabs[index] = matchedTab;

    await this.storageSet({ tabs });


    this.form.patchValue({ is_read: matchedTab.is_read });
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