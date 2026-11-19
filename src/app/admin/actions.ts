
"use server";

import { revalidatePath } from "next/cache";
import { adminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function permission(form: FormData) {
  const admin = await adminUser();
  const db = supabaseAdmin();

  const albumId = String(form.get("albumId") ?? "");
  const userId = String(form.get("userId") ?? "");
  const action = String(form.get("action") ?? "");

  if (action === "grant") {
    const { error } = await db.from("album_permissions").upsert({
      album_id: albumId,
      user_id: userId,
      granted_by: admin.id,
    });

    if (error) throw error;
  } else if (action === "revoke") {
    const { error } = await db
      .from("album_permissions")
      .delete()
      .eq("album_id", albumId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  revalidatePath("/admin");
}

export async function review(form: FormData) {
  await adminUser();

  const db = supabaseAdmin();
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");

  console.log("ADMIN REVIEW ACTION:", JSON.stringify(action));

  if (!id) throw new Error("Missing media ID");

  if (action === "delete") {
    const { data: media, error: fetchError } = await db
      .from("media")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (media) {
      const { error } = await db.storage
        .from("trip-media")
        .remove([media.storage_path]);

      if (error) throw error;
    }

    const { error } = await db.from("media").delete().eq("id", id);
    if (error) throw error;
  } else if (action === "approve" || action === "reject") {
    const { error } = await db
      .from("media")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        approved_at:
          action === "approve" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) throw error;
  } else {
    throw new Error("Unknown review action: " + action);
  }

  revalidatePath("/admin");
}
