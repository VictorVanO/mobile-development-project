import { db } from "@/lib/db";
import { taskSchema } from "@/lib/task";
import { z } from "zod";

export async function GET() {
  return Response.json(await db.task.findMany());
}

export async function POST(request: Request) {
  let task = taskSchema.parse(await request.json());
  return Response.json(await db.task.create({ data: task }));
}

export async function DELETE(request: Request) {
  let { id } = z.object({ id: z.number() }).parse(await request.json());
  return Response.json(await db.task.delete({ where: { id } }));
}