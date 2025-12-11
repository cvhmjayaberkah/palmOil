import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (session) {
    await signOut();
  }
  return NextResponse.json({ message: "Signed out" });
}