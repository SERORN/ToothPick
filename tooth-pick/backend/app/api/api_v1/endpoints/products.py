from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_products():
    return {"message": "Products endpoint - En desarrollo"}

@router.get("/{product_id}")
async def get_product(product_id: int):
    return {"message": f"Get product {product_id} - En desarrollo"}
