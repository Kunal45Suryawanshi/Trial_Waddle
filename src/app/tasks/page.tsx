import { TaskManager } from "@/components/task-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Tasks — IIML SVAP",
  description: "Simple one-page daily to-do list to stay focused.",
};

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-10 sm:py-16">
      <TaskManager />
    </div>
  );
}
