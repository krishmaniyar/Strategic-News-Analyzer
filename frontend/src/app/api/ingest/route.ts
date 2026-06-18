import { NextResponse } from "next/server";
import { runIngestionPipeline } from "@/lib/pipeline";

export const maxDuration = 300; // Allow up to 5 minutes for the pipeline
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runIngestionPipeline()) {
            const chunk = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          const errorEvent = JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : "Pipeline failed",
          });
          controller.enqueue(encoder.encode(errorEvent + "\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[ingest] Pipeline error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
