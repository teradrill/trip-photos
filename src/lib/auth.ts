import {supabaseServer} from "@/lib/supabase/server"; import {redirect} from "next/navigation";
export async function currentUser(){const s=await supabaseServer();const {data:{user}}=await s.auth.getUser();return user;}
export async function signedInUser(){const u=await currentUser();if(!u)redirect("/login");return u;}
export function isAdmin(email?:string|null){return !!email&&email.toLowerCase()===(process.env.ADMIN_EMAIL||"").toLowerCase();}
export async function adminUser(){const u=await signedInUser();if(!isAdmin(u.email))redirect("/");return u;}