
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const s = await supabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 }
    );
  }

  const db = supabaseAdmin();

  const { data: a } = await db
    .from("albums")
    .select("owner_id,title")
    .eq("id", id)
    .maybeSingle();

  const { data: p } = await db
    .from("album_permissions")
    .select("user_id")
    .eq("album_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!a || !(a.owner_id === user.id || p || isAdmin(user.email))) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { data: items } = await db
    .from("media")
    .select("storage_path,file_name,file_size")
    .eq("album_id", id)
    .eq("status", "approved");

  if (!items?.length) {
    return NextResponse.json(
      { error: "No approved media" },
      { status: 404 }
    );
  }

  if (
    items.reduce((n, x) => n + Number(x.file_size), 0) >
    100 * 1024 * 1024
  ) {
    return NextResponse.json(
      { error: "ZIP limited to 100 MB. Download items individually." },
      { status: 413 }
    );
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const item of items) {
    const { data, error } = await db.storage
      .from("trip-media")
      .download(item.storage_path);

    if (!error && data) {
      zip.file(item.file_name, await data.arrayBuffer());
    }
  }

  const blob = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return new Response(new Uint8Array(blob), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="trip-album-${id}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
