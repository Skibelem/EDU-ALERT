"""
Academic Risk Inference and Explainability Engine (FR-08 / Master Spec Section 7)
Loads Decision Tree artifact and computes risk categories and explainable contributing factors.
"""

import os
import json
import joblib
import pandas as pd
from typing import Dict, Any, List

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "decision_tree_v1.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata_v1.json")


class AcademicRiskPredictor:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.is_loaded = False
        self.reload()

    def reload(self):
        """Loads model and metadata from disk if available."""
        if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
                self.is_loaded = True
            except Exception as e:
                print(f"[AcademicRiskPredictor] Failed to load model artifact: {e}")
                self.is_loaded = False
        else:
            self.is_loaded = False

    def validate_inputs(self, attendance: float, participation: float, ca_score: float):
        """Enforces institutional bounds on academic indicators."""
        if attendance is None or not (0.0 <= float(attendance) <= 100.0):
            raise ValueError(f"Attendance percentage must be between 0 and 100 (got {attendance})")
        if participation is None or not (0.0 <= float(participation) <= 10.0):
            raise ValueError(f"Participation score must be between 0 and 10 (got {participation})")
        if ca_score is None or not (0.0 <= float(ca_score) <= 30.0):
            raise ValueError(f"Continuous Assessment score must be between 0 and 30 (got {ca_score})")

    def generate_explanation(self, attendance: float, participation: float, ca_score: float, risk_level: str) -> str:
        """
        Produces human-auditable, compliant explanation of contributing academic indicators (FR-08).
        """
        factors: List[str] = []

        # Attendance check
        if attendance < 60.0:
            factors.append(f"Critical attendance deficit: {attendance:.1f}% is critically below the 75% polytechnic exam threshold.")
        elif attendance < 75.0:
            factors.append(f"Borderline attendance: {attendance:.1f}% falls below the standard 75% lecture attendance policy.")

        # CA Score check
        if ca_score < 12.0:
            factors.append(f"Low Continuous Assessment: {ca_score:.1f}/30 is below the 40% course component pass mark.")
        elif ca_score < 18.0:
            factors.append(f"Moderate Continuous Assessment: {ca_score:.1f}/30 requires consolidation to secure pass grade.")

        # Participation check
        if participation < 4.0:
            factors.append(f"Low tutorial and lab engagement ({participation:.1f}/10).")

        if not factors:
            if risk_level == "Low":
                return "Student demonstrates satisfactory engagement and assessment scores across all continuous indicators."
            else:
                return f"Combined indicator profile places student in {risk_level} Risk band."

        summary = "; ".join(factors)
        return f"{risk_level} Risk factors identified: {summary}"

    def predict(self, attendance: float, participation: float, ca_score: float) -> Dict[str, Any]:
        """
        Runs model inference on validated academic indicators.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Decision Tree model artifact is not loaded. Run train_model.py first.")

        self.validate_inputs(attendance, participation, ca_score)

        features_df = pd.DataFrame([{
            "attendance_percentage": float(attendance),
            "participation_score": float(participation),
            "ca_score": float(ca_score)
        }])

        predicted_class = self.model.predict(features_df)[0]

        # Probabilities
        probabilities = {}
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(features_df)[0]
            classes = self.model.classes_
            for cls_name, prob in zip(classes, probs):
                probabilities[cls_name] = round(float(prob), 4)

        explanation = self.generate_explanation(attendance, participation, ca_score, predicted_class)

        return {
            "risk_level": predicted_class,
            "probabilities": probabilities,
            "explanation": explanation,
            "model_version": self.metadata.get("version", "v1.0-baseline") if self.metadata else "v1.0-baseline",
            "model_name": self.metadata.get("model_name", "DecisionTree") if self.metadata else "DecisionTree"
        }


predictor = AcademicRiskPredictor()
