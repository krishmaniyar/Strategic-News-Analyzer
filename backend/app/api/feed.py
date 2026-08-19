from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Optional
import json
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["Live Feed"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_article(self, article_data: dict):
        message = json.dumps({"type": "new_article", "data": article_data})
        # Collect failed connections first to avoid mutating the list during iteration
        failed: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error("ws_broadcast_failed", error=str(e))
                failed.append(connection)
        # Remove failed connections after iteration is complete
        for conn in failed:
            self.disconnect(conn)

manager = ConnectionManager()

@router.websocket("/ws/feed")
async def feed_endpoint(websocket: WebSocket, token: Optional[str] = None):
    # TODO: Validate Supabase JWT token before accepting
    # if not token or not await verify_supabase_token(token):
    #     await websocket.close(code=1008)
    #     return
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
