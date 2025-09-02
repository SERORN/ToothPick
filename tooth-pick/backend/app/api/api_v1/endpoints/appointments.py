from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_appointments():
    return {"message": "Appointments endpoint - En desarrollo"}

@router.get("/{appointment_id}")
async def get_appointment(appointment_id: int):
    return {"message": f"Get appointment {appointment_id} - En desarrollo"}
