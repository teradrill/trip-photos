"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveAlbumName(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const title = String(formData.get("title") || "").trim();
  if (title.length < 2 || title.length > 60) throw new Error("Album name must be 2–60 characters.");
  const db = supabaseAdmin();
  const { data: existing, error: findError } = await db.from("albums").select("id").eq("owner_id", user.id).maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) {
    const { error } = await db.from("albums").update({ title }).eq("id", existing.id).eq("owner_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("albums").insert({ owner_id: user.id, title });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
  redirect("/");
}
