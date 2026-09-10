from pydantic import BaseModel, Field

from app.services import razorpay_service


class OrderBody(BaseModel):
    payment_id: int = Field(gt=0)


class VerifyBody(BaseModel):
    payment_id: int = Field(gt=0)
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def create_order(body: OrderBody):
    return razorpay_service.create_order(payment_id=body.payment_id)


def verify_payment(body: VerifyBody):
    return razorpay_service.verify_payment(
        payment_id=body.payment_id,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )
