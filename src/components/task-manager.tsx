"use client";

import { Button, Input } from "@/components/ui";
import {
  formatToday,
  loadTasks,
  saveTasks,
  storageKey,
  type Task,
  type TaskFilter,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

const filters: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
];

export function TaskManager() {
  const key = storageKey();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTasks(loadTasks(key));
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (ready) saveTasks(key, tasks);
  }, [tasks, key, ready]);

  const persist = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks(updater);
  }, []);

  const addTask = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    persist((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() },
    ]);
    setDraft("");
  }, [draft, persist]);

  const toggleTask = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      );
    },
    [persist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((t) => t.id !== id));
    },
    [persist]
  );

  const clearCompleted = useCallback(() => {
    persist((prev) => prev.filter((t) => !t.done));
  }, [persist]);

  const visible = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.done);
    if (filter === "done") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="mx-auto w-full max-w-lg">
      <header className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-violet-600">
          Daily focus
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Today&apos;s Tasks
        </h1>
        <p className="mt-2 text-slate-600">{formatToday()}</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
        <div className="border-b border-slate-100 p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What needs to get done?"
              aria-label="New task"
              autoFocus
            />
            <Button type="submit" className="shrink-0 px-5">
              Add
            </Button>
          </form>
        </div>

        {total > 0 && (
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-slate-900">{doneCount}</span> of{" "}
                <span className="font-semibold text-slate-900">{total}</span> complete
              </span>
              <span className="font-medium text-violet-600">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-100 p-2">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                filter === id
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {label}
              {id === "all" && total > 0 && (
                <span className="ml-1 text-slate-400">({total})</span>
              )}
              {id === "active" && (
                <span className="ml-1 text-slate-400">({total - doneCount})</span>
              )}
              {id === "done" && (
                <span className="ml-1 text-slate-400">({doneCount})</span>
              )}
            </button>
          ))}
        </div>

        <ul className="max-h-[min(420px,50vh)] divide-y divide-slate-100 overflow-y-auto">
          {!ready ? (
            <li className="px-4 py-12 text-center text-sm text-slate-400">Loading…</li>
          ) : visible.length === 0 ? (
            <li className="px-4 py-12 text-center">
              <p className="text-4xl">✓</p>
              <p className="mt-3 font-medium text-slate-700">
                {filter === "done"
                  ? "No completed tasks yet"
                  : filter === "active" && total > 0
                    ? "All caught up — nice work!"
                    : "No tasks yet"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {total === 0
                  ? "Add your first task above to start the day."
                  : "Switch filters or add something new."}
              </p>
            </li>
          ) : (
            visible.map((task) => (
              <li
                key={task.id}
                className="group flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50/80"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                    task.done
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-slate-300 hover:border-violet-400"
                  )}
                >
                  {task.done && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 pt-0.5 text-base leading-snug",
                    task.done ? "text-slate-400 line-through" : "text-slate-800"
                  )}
                >
                  {task.text}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))
          )}
        </ul>

        {doneCount > 0 && (
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={clearCompleted}
              className="w-full rounded-xl py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-red-600"
            >
              Clear {doneCount} completed
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Tasks reset each day · Saved locally on this device
      </p>
    </div>
  );
}
