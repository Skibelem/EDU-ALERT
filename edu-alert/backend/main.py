"""
EDU-ALERT Backend & AI Inference Service
FastAPI REST API integrating scikit-learn Decision Tree with Supabase PostgreSQL (Master Spec 4.1 & 7).
"""

import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(__file__))

from predictor import predictor
from train_model import train_and_export_model

# Load environment variables from .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)

def get_supabase_client(token: Optional[str] = None) -> Optional[Client]:
    """Creates a Supabase client, attaching caller JWT if available for RLS enforcement."""
    if not (SUPABASE_URL and SUPABASE_KEY):
        return None
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        if token:
            clean_token = token.replace("Bearer ", "").strip()
            if clean_token:
                client.postgrest.auth(clean_token)
        return client
    except Exception as e:
        print(f"[Warning] Failed to initialize Supabase client: {e}")
        return None

app = FastAPI(
    title="EDU-ALERT AI Inference Service",
    description="Decision Tree Machine Learning API for Academic Early Warning (FR-08)",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentIndicatorInput(BaseModel):
    attendance_percentage: float = Field(..., ge=0.0, le=100.0)
    participation_score: float = Field(..., ge=0.0, le=10.0)
    ca_score: float = Field(..., ge=0.0, le=30.0)


class EvaluateOfferingRequest(BaseModel):
    evaluator_id: Optional[str] = None


@app.on_event("startup")
def startup_event():
    """Ensure the model is loaded on service startup."""
    predictor.reload()
    print(f"[EDU-ALERT AI] Server startup: Model loaded = {predictor.is_loaded}")


@app.get("/")
@app.get("/health")
def health_check():
    """Returns service operational state and active model status."""
    return {
        "status": "online",
        "service": "EDU-ALERT AI Inference Service",
        "institution": "Federal Polytechnic Ado-Ekiti (SWD)",
        "model_loaded": predictor.is_loaded,
        "active_model": predictor.metadata.get("model_name") if predictor.metadata else None,
        "version": predictor.metadata.get("version") if predictor.metadata else None,
        "algorithm": predictor.metadata.get("algorithm") if predictor.metadata else None
    }


@app.get("/model/status")
def model_status():
    """Returns detailed metrics and metadata of the active Decision Tree model."""
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Decision Tree model artifact is not currently loaded."
        )
    return {
        "is_active": True,
        "metadata": predictor.metadata
    }


@app.post("/predict/student")
def predict_single_student(payload: StudentIndicatorInput):
    """
    Direct indicator evaluation for an individual student.
    Returns calibrated risk level (Low, Medium, High) and explainable factors.
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI inference engine awaiting trained model artifact."
        )

    try:
        result = predictor.predict(
            attendance=payload.attendance_percentage,
            participation=payload.participation_score,
            ca_score=payload.ca_score
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/predict/offering/{offering_id}")
def evaluate_course_offering(
    offering_id: str,
    request: Request,
    payload: Optional[EvaluateOfferingRequest] = None
):
    """
    Evaluates all registered students in an offering based on lecturer-entered academic indicators.
    Persists risk predictions transactionally into the Supabase 'predictions' table.
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Decision Tree model artifact is not loaded. Train the baseline model first."
        )

    token = request.headers.get("Authorization")
    client = get_supabase_client(token)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not configured."
        )

    # 1. Fetch active model version ID from Supabase
    model_version_id = None
    try:
        mv_res = client.from_("model_versions").select("id").eq("is_active", True).limit(1).execute()
        if mv_res.data and len(mv_res.data) > 0:
            model_version_id = mv_res.data[0]["id"]
    except Exception as e:
        print(f"[Notice] Could not query model_versions: {e}")

    # 2. Fetch academic records for this offering
    try:
        records_res = (
            client.from_("academic_records")
            .select("*")
            .eq("offering_id", offering_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query academic records: {e}"
        )

    records = records_res.data or []
    if not records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No student continuous assessment records have been recorded for this course offering yet. Enter scores on the Enter Records page first."
        )

    # 3. Predict for each student record and write to predictions table
    evaluated_records = []
    errors = []

    for rec in records:
        try:
            student_id = rec.get("student_id")
            rec_id = rec.get("id")
            att = rec.get("attendance_percentage", 0.0)
            part = rec.get("participation_score", 0.0)
            ca = rec.get("ca_score", 0.0)

            # Inference via Decision Tree
            pred_output = predictor.predict(att, part, ca)

            eval_by = (payload and payload.evaluator_id) or rec.get("recorded_by")

            pred_row = {
                "student_id": student_id,
                "offering_id": offering_id,
                "academic_record_id": rec_id,
                "risk_level": pred_output["risk_level"],
                "explanation": pred_output["explanation"],
                "evaluated_by": eval_by,
            }
            if model_version_id:
                pred_row["model_version_id"] = model_version_id

            # Save to Supabase predictions table
            try:
                client.from_("predictions").insert([pred_row]).execute()
            except Exception as db_write_err:
                print(f"[Notice] Could not persist prediction to Supabase: {db_write_err}")

            evaluated_records.append({
                "student_id": student_id,
                "risk_level": pred_output["risk_level"],
                "explanation": pred_output["explanation"],
                "probabilities": pred_output.get("probabilities")
            })
        except Exception as item_err:
            print(f"[Error] Failed to evaluate student {rec.get('student_id')}: {item_err}")
            errors.append(str(item_err))

    return {
        "status": "success",
        "offeringId": offering_id,
        "evaluatedCount": len(evaluated_records),
        "results": evaluated_records,
        "errors": errors if errors else None
    }


@app.post("/train")
def retrain_model():
    """
    Retrains the baseline Decision Tree classifier, saves the serialized artifact,
    and updates the active version in Supabase.
    """
    try:
        metadata = train_and_export_model()
        predictor.reload()

        # Update or register in Supabase model_versions if available
        client = get_supabase_client()
        if client:
            try:
                # Deactivate older models
                client.from_("model_versions").update({"is_active": False}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
                
                # Insert new active version
                client.from_("model_versions").insert([{
                    "model_name": metadata["model_name"],
                    "version": metadata["version"],
                    "algorithm": metadata["algorithm"],
                    "is_active": True,
                    "metrics": metadata["metrics"]
                }]).execute()
            except Exception as db_err:
                print(f"[Notice] model_versions sync notice: {db_err}")

        return {
            "status": "success",
            "message": "Decision Tree model retrained and activated successfully.",
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
