import { z } from "zod";

export const taskSchema = z.object({
  title: z.string(),
  completed: z.boolean(),
});

export const savedTaskSchema = taskSchema.extend({
  id: z.number(),
});

export type Task = z.infer<typeof taskSchema>;
export type SavedTask = z.infer<typeof savedTaskSchema>;

export async function getTasks() {
  const res = await fetch("http://localhost:3000/api/tasks");
  return (await res.json()) as SavedTask[];
}

export async function addTask(task: Task) {
  task = taskSchema.parse(task);
  const res = await fetch("http://localhost:3000/api/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
  return (await res.json()) as SavedTask;
}

export async function deleteTask(id: number) {
  const res = await fetch("http://localhost:3000/api/tasks", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return (await res.json()) as SavedTask;
}