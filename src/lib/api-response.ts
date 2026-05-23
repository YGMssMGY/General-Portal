import { NextResponse } from "next/server";

type SuccessResponse<T> = { success: true; data: T };
type ErrorResponse = { success: false; error: string };

export function success<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function error(message: string, status = 400): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false as const, error: message }, { status });
}
