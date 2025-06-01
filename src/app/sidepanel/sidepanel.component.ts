import { Component, ElementRef, NgZone, OnInit, Renderer2 } from '@angular/core';
import { SavedTab } from '../model/savedTab.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidepanel',
  imports: [CommonModule],
  templateUrl: './sidepanel.component.html',
  styleUrl: './sidepanel.component.css',
})
export class SidepanelComponent implements OnInit {
  savedTabs: SavedTab[] = [];
  constructor(readonly renderer: Renderer2, readonly elRef: ElementRef, readonly ngZone: NgZone) {}

  ngOnInit() {
    console.log("init")
    this.renderTabs();
  }

  renderTabs() {
    chrome.storage.sync.get(['tabs'], (result: { tabs?: any[] }) => {
      // Run this code inside Angular's zone to trigger change detection
      this.ngZone.run(() => {
        this.savedTabs = (result['tabs'] ?? [])
          .slice()
          .reverse()
          .filter((t) => t.is_active);
        console.log("saved tabs", this.savedTabs);
        // Timeout to ensure Angular renders DOM before we attach events
        setTimeout(() => this.attachDOMListeners(), 0);
      });
    });
  }

  attachDOMListeners() {
    const native = this.elRef.nativeElement;

    const checkboxes = native.querySelectorAll('.read-checkbox');
    const crossIcons = native.querySelectorAll('.archive-icon');

    checkboxes.forEach((checkbox: HTMLInputElement, index: number) => {
      this.renderer.listen(checkbox, 'change', () => {
        this.toggleIsRead(this.savedTabs[index]);
      });
    });

    crossIcons.forEach((icon: HTMLElement, index: number) => {
      this.renderer.listen(icon, 'click', () => {
        this.deactivateTab(this.savedTabs[index]);
      });
    });
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
}
