"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { karteActionSchema, karteEntrySchema, karteGoalSchema } from "@/domain/schemas";
import { getCurrentActor, getServiceContext } from "../current-actor";
import { addKarteAction, addKarteEntry, archiveKarteAction, deleteKarteEntry, saveKarteGoal } from "../services/karte-service";
import { runAction } from "./action-result";

/** カルテの Server Action。権限はサービス側で毎回判定する（ここでは入力の形だけを見る） */

const idSchema = z.string().min(1).max(64);

function refresh(): void {
  revalidatePath("/karte", "layout");
}

export async function saveKarteGoalAction(input: unknown) {
  const result = await runAction("karte.goal_save", async () => {
    const goal = await saveKarteGoal(getServiceContext(), await getCurrentActor(), karteGoalSchema.parse(input));
    return { id: goal.id };
  });
  if (result.ok) refresh();
  return result;
}

export async function addKarteActionAction(input: unknown) {
  const result = await runAction("karte.action_save", async () => {
    const action = await addKarteAction(getServiceContext(), await getCurrentActor(), karteActionSchema.parse(input));
    return { id: action.id };
  });
  if (result.ok) refresh();
  return result;
}

export async function archiveKarteActionAction(actionId: string) {
  const result = await runAction("karte.action_archive", async () => archiveKarteAction(getServiceContext(), await getCurrentActor(), { actionId: idSchema.parse(actionId) }));
  if (result.ok) refresh();
  return result;
}

export async function addKarteEntryAction(input: unknown) {
  const result = await runAction("karte.entry_create", async () => {
    const entry = await addKarteEntry(getServiceContext(), await getCurrentActor(), karteEntrySchema.parse(input));
    return { id: entry.id };
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteKarteEntryAction(entryId: string) {
  const result = await runAction("karte.entry_delete", async () => deleteKarteEntry(getServiceContext(), await getCurrentActor(), { entryId: idSchema.parse(entryId) }));
  if (result.ok) refresh();
  return result;
}
