import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../../../lib/mongodb";
import { performanceLogger } from "../../../lib/performance";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Quick database connection test
    const db = await getDatabase();
    
    // Test basic database operations
    const healthCheck = await Promise.all([
      db.admin().ping(),
      db.collection("receptionists").estimatedDocumentCount(),
      db.collection("doctors").estimatedDocumentCount(),
      db.collection("appointments").estimatedDocumentCount(),
    ]);

    const [pingResult, receptionistCount, doctorCount, appointmentCount] = healthCheck;

    performanceLogger.logApiCall('/api/health', startTime, true);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        ping: "ok",
        responseTime: Date.now() - startTime + "ms"
      },
      collections: {
        receptionists: receptionistCount,
        doctors: doctorCount,
        appointments: appointmentCount
      },
      performance: {
        cacheHitRate: performanceLogger.cacheStats.getHitRate() + "%",
        uptime: Math.round((Date.now() - performanceLogger.startTime) / 1000) + "s"
      }
    });

  } catch (error) {
    performanceLogger.logApiCall('/api/health', startTime, false);

    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime + "ms"
      }
    }, { status: 503 });
  }
}