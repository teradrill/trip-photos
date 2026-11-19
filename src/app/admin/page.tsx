
import { adminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { permission, review } from "./actions";

export default async function Admin() {
  await adminUser();

  const db = supabaseAdmin();

  const [
    { data: albums },
    { data: users },
    { data: pending },
    { data: perms },
  ] = await Promise.all([
    db.from("albums").select("id,title,owner_id").order("created_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 100 }),
    db
      .from("media")
      .select("id,album_id,file_name,media_type")
      .eq("status", "pending"),
    db.from("album_permissions").select("album_id,user_id"),
  ]);

  const granted = new Set(
    (perms || []).map((p) => p.album_id + ":" + p.user_id)
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <a href="/">← Homepage</a>

      <h1 className="my-5 text-3xl font-bold">Admin</h1>

      <h2 className="text-xl font-semibold">Album access</h2>

      {(albums || []).map((a) => (
        <section
          key={a.id}
          className="my-3 rounded-xl border bg-white p-4"
        >
          <b>{a.title}</b>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(users.users || [])
              .filter((u) => u.id !== a.owner_id)
              .map((u) => (
                <form
                  action={permission}
                  key={u.id}
                  className="flex justify-between gap-2 rounded bg-gray-50 p-2 text-sm"
                >
                  <input
                    type="hidden"
                    name="albumId"
                    value={a.id}
                  />

                  <input
                    type="hidden"
                    name="userId"
                    value={u.id}
                  />

                  <span className="truncate">{u.email}</span>

                  {granted.has(a.id + ":" + u.id) ? (
                    <button
                      type="submit"
                      name="action"
                      value="revoke"
                      className="underline"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      type="submit"
                      name="action"
                      value="grant"
                      className="font-semibold underline"
                    >
                      Grant
                    </button>
                  )}
                </form>
              ))}
          </div>
        </section>
      ))}

      <h2 className="mb-3 mt-8 text-xl font-semibold">
        Pending uploads
      </h2>

      {(pending || []).map((m) => (
        <div
          key={m.id}
          className="my-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"
        >
          <span>
            {m.file_name} · {m.media_type}
          </span>

          <div className="flex gap-2">
            {["approve", "reject", "delete"].map((action) => (
              <form action={review} key={action}>
                <input
                  type="hidden"
                  name="id"
                  value={m.id}
                />

                <input
                  type="hidden"
                  name="action"
                  value={action}
                />

                <button
                  type="submit"
                  className="rounded border px-3 py-1 text-sm"
                >
                  {action}
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
