import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {isAdmin} from "@/lib/auth";

export const runtime="nodejs";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const s=await supabaseServer();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const db=supabaseAdmin();
  const {data:m}=await db.from("media").select("id,album_id,storage_path,file_name,status").eq("id",id).maybeSingle();
  if(!m||m.status!=="approved")return NextResponse.json({error:"Not found"},{status:404});
  const {data:a}=await db.from("albums").select("owner_id").eq("id",m.album_id).maybeSingle();
  const {data:p}=await db.from("album_permissions").select("user_id").eq("album_id",m.album_id).eq("user_id",user.id).maybeSingle();
  if(!a||!(a.owner_id===user.id||p||isAdmin(user.email)))return NextResponse.json({error:"Forbidden"},{status:403});
  const {data:blob,error}=await db.storage.from("trip-media").download(m.storage_path);
  if(error||!blob)return NextResponse.json({error:"Download failed"},{status:500});
  return new Response(blob,{headers:{"Content-Type":blob.type||"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(m.file_name)}`,"Cache-Control":"private, no-store"}});
}