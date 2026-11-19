import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signedInUser, isAdmin } from "@/lib/auth";
import { Upload } from "@/components/upload";
import { Gallery } from "@/components/gallery";

export default async function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await signedInUser();
  const session = await supabaseServer();
  const db = supabaseAdmin();
  const { data: a } = await db.from("albums").select("id,title,owner_id").eq("id", id).maybeSingle();
  if (!a) notFound();
  const { data: permission } = await session.from("album_permissions").select("album_id").eq("album_id", id).eq("user_id", user.id).maybeSingle();
  const owner = a.owner_id === user.id;
  const allowed = owner || isAdmin(user.email) || !!permission;
  if (!allowed) return <main className="mx-auto max-w-xl p-8"><Link href="/">← Albums</Link><div className="mt-8 rounded-xl border bg-white p-8 text-center"><div className="text-4xl">🔒</div><h1 className="mt-3 text-2xl font-bold">Admin approval required</h1><p className="mt-2 text-gray-600">You need admin permission to view this album. Please wait until the admin approves your access.</p></div></main>;
  const [{ data: items }, { data: profile }] = await Promise.all([
    db.from("media").select("*").eq("album_id", id).eq("status", "approved").order("created_at", { ascending: false }),
    db.from("profiles").select("username").eq("id", a.owner_id).maybeSingle()
  ]);
  const ready = await Promise.all((items || []).map(async (m: any) => { const { data } = await db.storage.from("trip-media").createSignedUrl(m.storage_path, 900); return { ...m, url: data?.signedUrl || "" }; }));
  return <main className="mx-auto max-w-5xl p-6"><Link href="/">← Albums</Link><div className="my-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-green-800">@{profile?.username || "member"}</p><h1 className="text-3xl font-bold">{a.title}</h1></div>{owner && <Upload albumId={id} />}</div><Gallery items={ready} /><a className="mt-8 inline-block rounded bg-black px-4 py-3 text-white" href={`/api/albums/${id}/zip`}>Download album ZIP</a></main>;
}
