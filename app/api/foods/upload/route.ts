import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image is too large (max 10MB)" }, { status: 400 })
    }

    // The Blob store is private, so upload with private access and serve the
    // file through our own /api/foods/image route (private URLs aren't public).
    const blob = await put(`foods/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    })

    const url = `/api/foods/image?pathname=${encodeURIComponent(blob.pathname)}`
    return NextResponse.json({ url })
  } catch (error) {
    console.log("[v0] Food image upload route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
