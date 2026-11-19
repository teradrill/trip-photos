import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser, isAdmin } from "@/lib/auth";
import { saveAlbumName } from "./actions";

export default async function Home() {
  const user = await currentUser();
  if (!user) return <main className="p-10"><h1 className="text-3xl font-bold">Trip Memories</h1><p className="my-3">A shared place for your trip photos and videos.</p><Link className="rounded bg-black px-4 py-2 text-white" href="/login">Sign in</Link></main>;
  const db = supabaseAdmin();
  const { data: albums } = await db.from("albums").select("id,title,owner_id").order("created_at");
  const { data: profiles } = await db.from("profiles").select("id,username");
  const ownAlbum = (albums || []).find(a => a.owner_id === user.id);
  const ids = (albums || []).map(a => a.id);
  const { data: media } = ids.length ? await db.from("media").select("album_id,storage_path,media_type").in("album_id", ids).eq("status", "approved").order("created_at", { ascending: false }) : { data: [] as any[] };
  const byAlbum = new Map<string, { photos: number; videos: number; cover?: string }>();
  for (const m of media || []) {
    const item = byAlbum.get(m.album_id) || { photos: 0, videos: 0 };
    if (m.media_type === "video") item.videos++; else item.photos++;
    if (!item.cover && m.media_type === "image") {
      const { data } = await db.storage.from("trip-media").createSignedUrl(m.storage_path, 900);
      item.cover = data?.signedUrl;
    }
    byAlbum.set(m.album_id, item);
  }
  return <main className="mx-auto max-w-5xl p-6">
    <header className="flex flex-wrap justify-between gap-3 border-b pb-5"><div><p className="text-sm text-green-800">PRIVATE TRIP COLLECTION</p><h1 className="text-3xl font-bold">Trip Memories</h1></div><div className="text-sm">{user.email} {isAdmin(user.email) && <Link className="ml-3 underline" href="/admin">Admin</Link>}<form action="/auth/signout" method="post" className="inline"><button className="ml-3 underline">Sign out</button></form></div></header>
    <section className="my-7 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">{ownAlbum ? "Name your album" : "Add your album"}</h2><p className="my-2 text-sm text-gray-600">Choose the name people will see on your album.</p><form action={saveAlbumName} className="flex flex-wrap gap-2"><input name="title" required minLength={2} maxLength={60} defaultValue={ownAlbum?.title || ""} placeholder="e.g. Summer Trip 2026" className="min-w-0 flex-1 rounded border px-3 py-2"/><button className="rounded bg-black px-5 py-2 text-white">{ownAlbum ? "Save name" : "Add Album"}</button></form></section>
    <h2 className="mb-1 mt-8 text-xl font-semibold">Members' albums</h2><p className="mb-4 text-sm text-gray-600">Album covers are visible to signed-in members. Opening an album may require admin permission.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(albums || []).map(a => { const p = (profiles || []).find(x => x.id === a.owner_id); const c = byAlbum.get(a.id) || { photos: 0, videos: 0 }; return <Link href={`/albums/${a.id}`} key={a.id} className="overflow-hidden rounded-xl border bg-white"><div className="flex aspect-video items-end bg-gradient-to-br from-green-100 to-emerald-700 bg-cover bg-center p-4 text-3xl text-white" style={c.cover ? { backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.35),transparent),url("${c.cover}")` } : {}}>{(p?.username || "M").slice(0,1).toUpperCase()}</div><div className="p-4"><b>{a.title}</b><p className="text-sm text-gray-500">@{p?.username || "member"} · {c.photos} photos · {c.videos} videos</p></div></Link>; })}</div>
  </main>;
}
