"""
07_train_model.py
-----------------
Step 7 — Train the XGBoost model for Package Prediction.

Actions:
  1. Load train/test data and the saved preprocessor
  2. Transform features using the preprocessor
  3. Train an XGBoost Regressor
  4. Evaluate on both train and test sets (RMSE, MAE, R2)
  5. Save the trained model
  6. Plot and save feature importances

Run: python src/07_train_model.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

from config import (
    X_TRAIN_PATH,
    X_TEST_PATH,
    Y_TRAIN_PATH,
    Y_TEST_PATH,
    PREPROCESSOR_PATH,
    MODEL_PATH,
    MODELS_DIR,
    REPORTS_DIR,
    RANDOM_STATE
)

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 7 — MODEL TRAINING (XGBOOST)")
print("=" * 60)

X_train = pd.read_csv(X_TRAIN_PATH)
X_test  = pd.read_csv(X_TEST_PATH)
y_train = pd.read_csv(Y_TRAIN_PATH).squeeze()
y_test  = pd.read_csv(Y_TEST_PATH).squeeze()

print(f"\nTraining set : {X_train.shape[0]} rows")
print(f"Testing set  : {X_test.shape[0]} rows")


# ──────────────────────────────────────────────
# Preprocess
# ──────────────────────────────────────────────

print("\nLoading preprocessor...")
preprocessor = joblib.load(PREPROCESSOR_PATH)

X_train_tf = preprocessor.transform(X_train)
X_test_tf  = preprocessor.transform(X_test)

# Get feature names for importance plotting
try:
    feature_names = preprocessor.get_feature_names_out()
except Exception:
    feature_names = [f"f{i}" for i in range(X_train_tf.shape[1])]


# ──────────────────────────────────────────────
# Train
# ──────────────────────────────────────────────

print("\nTraining XGBoost Regressor...")
model = XGBRegressor(
    n_estimators=100,
    learning_rate=0.05,
    max_depth=4,
    random_state=RANDOM_STATE,
    n_jobs=-1
)

model.fit(X_train_tf, y_train)
print("Training complete.")


# ──────────────────────────────────────────────
# Evaluate
# ──────────────────────────────────────────────

def evaluate(model, X, y, dataset_name="Test"):
    preds = model.predict(X)
    rmse = np.sqrt(mean_squared_error(y, preds))
    mae = mean_absolute_error(y, preds)
    r2 = r2_score(y, preds)

    print(f"\n📊 {dataset_name} Performance:")
    print(f"   RMSE : {rmse:.2f} LPA")
    print(f"   MAE  : {mae:.2f} LPA")
    print(f"   R²   : {r2:.3f}")
    return preds

train_preds = evaluate(model, X_train_tf, y_train, "Train")
test_preds  = evaluate(model, X_test_tf,  y_test,  "Test")


# ──────────────────────────────────────────────
# Save Model
# ──────────────────────────────────────────────

MODELS_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_PATH)
print(f"\n✅ Model saved to: {MODEL_PATH}")


# ──────────────────────────────────────────────
# Feature Importance Plot
# ──────────────────────────────────────────────

print("\nGenerating Feature Importance plot...")
importances = model.feature_importances_
importance_df = pd.DataFrame({
    "Feature": feature_names,
    "Importance": importances
}).sort_values(by="Importance", ascending=False).head(15)

fig, ax = plt.subplots(figsize=(10, 6))
sns.barplot(data=importance_df, x="Importance", y="Feature", palette="viridis", ax=ax)
ax.set_title("Top 15 Feature Importances (XGBoost)")
ax.set_xlabel("Relative Importance")
ax.set_ylabel("")
plt.tight_layout()

imp_path = REPORTS_DIR / "11_feature_importance.png"
fig.savefig(imp_path)
plt.close(fig)

print(f"✅ Feature importance plot saved to: {imp_path}\n")
