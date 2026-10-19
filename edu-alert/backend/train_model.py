"""
EDU-ALERT Machine Learning Pipeline
Trains a Decision Tree Classifier for Academic Early Warning (FR-08 / Spec Section 7).
Inputs: Attendance (0-100), Class Participation (0-10), Continuous Assessment (0-30).
Target: Academic Risk Level ('Low', 'Medium', 'High').
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "decision_tree_v1.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata_v1.json")


def generate_baseline_dataset(n_samples: int = 1200, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic, calibrated synthetic training distribution representing
    polytechnic students (SWD Department) prior to semester examinations.
    Per Specification 7.4, clearly documented as synthetic baseline for initial deployment.
    """
    np.random.seed(random_state)

    # 1. Attendance Percentage (0 - 100), institutional mean ~72%
    attendance = np.random.normal(loc=72.0, scale=18.0, size=n_samples)
    attendance = np.clip(np.round(attendance, 1), 0.0, 100.0)

    # 2. Participation Score (0 - 10), correlated with attendance
    part_noise = np.random.normal(loc=0.0, scale=1.5, size=n_samples)
    participation = (attendance / 10.0) * 0.7 + part_noise
    participation = np.clip(np.round(participation, 1), 0.0, 10.0)

    # 3. Continuous Assessment Score (0 - 30), institutional threshold 12 (40%) / 15 (50%)
    ca_base = (attendance * 0.18) + (participation * 0.6)
    ca_noise = np.random.normal(loc=0.0, scale=3.5, size=n_samples)
    ca_score = ca_base + ca_noise
    ca_score = np.clip(np.round(ca_score, 1), 0.0, 30.0)

    # 4. Target Risk Classification
    # Polytechnic criteria:
    # High Risk: Failing attendance (< 60%) OR failing CA (< 12) OR both attendance < 70% and CA < 15.
    # Medium Risk: Attendance 60-75% OR CA 12-17.
    # Low Risk: Attendance >= 75% AND CA >= 18.
    risk_labels = []
    for att, part, ca in zip(attendance, participation, ca_score):
        if att < 60.0 or ca < 12.0 or (att < 70.0 and ca < 15.0):
            risk = "High"
        elif att < 75.0 or ca < 18.0:
            risk = "Medium"
        else:
            risk = "Low"

        # Inject 4% real-world noise/variance to avoid synthetic perfection
        if np.random.rand() < 0.04:
            risk = np.random.choice(["Low", "Medium", "High"])

        risk_labels.append(risk)

    df = pd.DataFrame({
        "attendance_percentage": attendance,
        "participation_score": participation,
        "ca_score": ca_score,
        "risk_level": risk_labels
    })

    return df


def train_and_export_model():
    print("=" * 60)
    print("EDU-ALERT: Training Decision Tree Classifier Baseline")
    print("=" * 60)

    # 1. Dataset Generation
    df = generate_baseline_dataset(n_samples=1200, random_state=42)
    feature_cols = ["attendance_percentage", "participation_score", "ca_score"]
    target_col = "risk_level"

    X = df[feature_cols]
    y = df[target_col]

    print(f"Dataset Size: {len(df)} samples")
    print("Class Distribution:")
    print(df[target_col].value_counts().to_string())

    # 2. Stratified Train/Test Split (80% Train, 20% Held-out Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 3. Model Architecture: Decision Tree with Max Depth = 4
    # Max depth of 4 provides high interpretability, prevents overfitting,
    # and mirrors human academic assessment rules.
    clf = DecisionTreeClassifier(
        max_depth=4,
        min_samples_split=15,
        min_samples_leaf=10,
        random_state=42,
        class_weight="balanced"
    )
    clf.fit(X_train, y_train)

    # 4. Evaluation on Held-Out Test Set
    y_pred = clf.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred, output_dict=True)
    c_matrix = confusion_matrix(y_test, y_pred, labels=["Low", "Medium", "High"]).tolist()

    print("\nModel Evaluation Metrics (Test Set):")
    print(f"Accuracy: {accuracy * 100:.2f}%")
    print(f"Macro F1-Score: {report['macro avg']['f1-score']:.3f}")
    print(classification_report(y_test, y_pred))

    # 5. Export Model Artifact
    joblib.dump(clf, MODEL_PATH)
    print(f"Saved trained model artifact to: {MODEL_PATH}")

    # 6. Save Metadata & Metrics
    metadata = {
        "model_name": "SWD-DecisionTree-EarlyWarning",
        "version": "v1.0-baseline",
        "algorithm": "DecisionTreeClassifier (max_depth=4, balanced)",
        "features": feature_cols,
        "classes": ["Low", "Medium", "High"],
        "metrics": {
            "accuracy": round(accuracy, 4),
            "macro_f1": round(report["macro avg"]["f1-score"], 4),
            "low_f1": round(report["Low"]["f1-score"], 4),
            "medium_f1": round(report["Medium"]["f1-score"], 4),
            "high_f1": round(report["High"]["f1-score"], 4),
            "confusion_matrix": c_matrix,
            "test_samples": len(y_test),
            "total_samples": len(df),
            "training_date": pd.Timestamp.now().isoformat()
        },
        "description": "Baseline Decision Tree classifier calibrated for continuous assessment early warning (FR-08)."
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved metadata to: {METADATA_PATH}")
    print("=" * 60)
    return metadata


if __name__ == "__main__":
    train_and_export_model()
