"use server";

import { registrationApplicationSchema } from "@/domain/schemas";
import { getServiceContext } from "../current-actor";
import { submitApplication } from "../services/registration-service";
import { runAction } from "./action-result";

/** 入会の申し込み（ログインなし）。受け付けたことだけを返し、申し込みの中身は返さない */
export async function submitApplicationAction(values: unknown) {
  return runAction("application.submit", async () => {
    const input = registrationApplicationSchema.parse(values);
    await submitApplication(getServiceContext(), input);
    return { received: true };
  });
}
