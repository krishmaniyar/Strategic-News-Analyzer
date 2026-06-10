from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import asyncio
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
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error("ws_broadcast_failed", error=str(e))
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws/feed")
async def feed_endpoint(websocket: WebSocket, token: str = None):
    # In a real app, verify the JWT token here using Supabase auth
    # For now, accept the connection
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
