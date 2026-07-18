import { NextResponse } from "next/server"; import { integrationStatuses } from "@/lib/integrations"; export async function GET(){return NextResponse.json(integrationStatuses());}
