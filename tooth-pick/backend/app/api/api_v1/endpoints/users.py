from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_users():
    return {"message": "Users endpoint - En desarrollo"}

@router.get("/{user_id}")
async def get_user(user_id: int):
    return {"message": f"Get user {user_id} - En desarrollo"}
