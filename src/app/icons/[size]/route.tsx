import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

export const runtime = "edge";

type Params = { params: Promise<{ size: string }> };

/** Dynamic PNG icons for PWA install (192 / 512). */
export async function GET(_request: Request, { params }: Params) {
  const { size: sizeRaw } = await params;
  const size = Number(sizeRaw);
  if (![192, 512].includes(size)) {
    return NextResponse.json({ error: "Unsupported size" }, { status: 400 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: Math.round(size * 0.45),
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: size, height: size },
  );
}
