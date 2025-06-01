export interface SavedTab {
  id: string;
  title: string;
  url: string;
  intent: string;
  savedAt: string | number;
  is_read: boolean;
  is_active: boolean;
}