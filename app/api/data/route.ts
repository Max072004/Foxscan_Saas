import { NextResponse } from "next/server"; import { getData } from "@/lib/store";
export async function GET() { return NextResponse.json(await getData()); }
