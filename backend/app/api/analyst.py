from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.rag.query_engine import rag_query

router = APIRouter(prefix="/api/v2/analyst", tags=["Analyst Interface"])

class QueryRequest(BaseModel):
    question: str

@router.post("/query")
async def process_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """RAG-powered query answering for analysts."""
    try:
        result = await rag_query(db, request.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
