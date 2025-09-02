from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics():
    return {"message": "Analytics dashboard - En desarrollo"}

@router.get("/reports")
async def get_reports():
    return {"message": "Analytics reports - En desarrollo"}
