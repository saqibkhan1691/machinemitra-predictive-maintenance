from pydantic import BaseModel, Field
from typing import Literal

class SensorInput(BaseModel):
    machineId: str = Field(min_length=1, max_length=80)
    productType: Literal['L','M','H']
    airTemperature: float = Field(ge=250, le=400)
    processTemperature: float = Field(ge=250, le=450)
    rotationalSpeed: float = Field(ge=0, le=10000)
    torque: float = Field(ge=0, le=200)
    toolWear: float = Field(ge=0, le=500)

class WorkOrderInput(BaseModel):
    machineId: str
    title: str
    priority: Literal['Low','Medium','High'] = 'Medium'
    status: str = 'Pending'
    technician: str = ''
    dueDate: str = ''
