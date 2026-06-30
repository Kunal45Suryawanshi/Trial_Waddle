export type Task = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

export type TaskFilter = "all" | "active" | "done";

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatToday(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function storageKey(date = new Date()): string {
  return `svap-tasks-${todayKey(date)}`;
}

export function loadTasks(key: string): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(key: string, tasks: Task[]): void {
  localStorage.setItem(key, JSON.stringify(tasks));
}
