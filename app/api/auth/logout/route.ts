import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json()
    
    // Here you could invalidate the session in your database if you're storing sessions
    // For now, we'll just acknowledge the logout request
    
    console.log("User logged out with session:", sessionToken)
    
    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Logout failed" }, 
      { status: 500 }
    )
  }
}