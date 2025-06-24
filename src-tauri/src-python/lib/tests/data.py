import pandas as pd
import numpy as np
from faker import Faker
import math
import os

# --- CONFIG & SEED ---
SEED = 42
np.random.seed(SEED)
Faker.seed(SEED)
fake = Faker()

# STUDENTS & CLASSES
N = 1000
CLASS_SIZE = 25
n_classes = math.ceil(N / CLASS_SIZE)
class_ids = np.arange(1, n_classes + 1)

# GENERATE UNIQUE NAMES
names = []
seen = set()
while len(names) < N:
    nm = fake.name()
    if nm not in seen:
        seen.add(nm)
        names.append(nm)

# ASSIGN & SHUFFLE CLASSES
classes = np.repeat(class_ids, CLASS_SIZE)[:N]
np.random.shuffle(classes)

# LATENT ABILITY ∼ N(75,10)
latent = np.random.normal(75, 10, N)

# EPA “true” score (uncut)
epa = (latent - latent.mean()) * 0.03 + 2.5 + np.random.normal(0, 0.5, N)
# some will fall outside [0,5]—we'll fix below by rejection sampling

# TEACHER QUALITY
teacher_q = {c: np.random.normal(0,1) for c in class_ids}

# TASKS & DIFFICULTIES
tasks = ["Task 1", "Task 2", "Task 3", "Task 4"]
difficulties = {"Task 1":0, "Task 2":10, "Task 3":10, "Task 4":20}

# SIMULATION PARAMS
α_teacher = 2.0    # teacher effect on Task 1
β_latent  = 1.0    # latent effect on Task 1
base_imp  = 1.0    # baseline gain per task
γ_epa     = 0.8    # EPA’s effect on gain
δ_teacher = 0.3    # teacher’s effect on gain
ρ_peer    = 0.2    # peer effect
σ_imp     = 2.5    # noise in improvement
σ_mark    = 5.0    # noise in final mark

# --- 1) BUILD ABILITIES & RAW MARKS ----
abilities = np.zeros((N, len(tasks)))
marks     = np.zeros_like(abilities)

# Task 1 initial ability
abilities[:,0] = (
    β_latent * latent
    + α_teacher * np.vectorize(teacher_q.get)(classes)
)

# Tasks 2–4: sequential improvement
for t in range(1, len(tasks)):
    prev = abilities[:, t-1]
    class_mean = {c: prev[classes==c].mean() for c in class_ids}
    overall   = prev.mean()
    for i in range(N):
        c = classes[i]
        # EPA term: if epa<3 negative, if >3 positive
        epa_term = γ_epa * (epa[i] - 3.0)
        μ_imp = base_imp + epa_term + δ_teacher*teacher_q[c] + ρ_peer*(class_mean[c] - overall)
        abilities[i,t] = prev[i] + np.random.normal(μ_imp, σ_imp)

# Convert to raw marks (ability – difficulty + noise)
raw_marks = np.zeros_like(abilities)
for idx, task in enumerate(tasks):
    raw = abilities[:, idx] - difficulties[task]
    raw_marks[:, idx] = raw + np.random.normal(0, σ_mark, N)

# --- 2) REJECTION-SAMPLE MARKS INTO [0,100] ----
# For each task, resample only those outside bounds
final_marks = raw_marks.copy()
for idx in range(len(tasks)):
    mask = (final_marks[:,idx] < 0) | (final_marks[:,idx] > 100)
    while mask.any():
        # regenerate noise and reapply
        reraw = abilities[mask, idx] - difficulties[tasks[idx]]
        final_marks[mask, idx] = reraw + np.random.normal(0, σ_mark, mask.sum())
        mask = (final_marks[:,idx] < 0) | (final_marks[:,idx] > 100)

# --- 3) ESTIMATE per-task EPA WITH REJECTION-SAMPLING → [0,5] ----
def sample_epa(mark):
    # piecewise mean + varying noise
    if mark >= 90:
        μ, σ = 4.8, 0.1
    elif mark >= 80:
        μ, σ = 4.2, 0.5
    elif mark >= 70:
        μ, σ = 3.5, 0.8
    elif mark >= 60:
        μ, σ = 2.8, 1.2
    else:
        μ, σ = 1.5, 1.5  # lower mean & wider σ for true low-EPA
    # rejection sample until in [0,5]
    while True:
        val = np.random.normal(μ, σ)
        if 0.0 <= val <= 5.0:
            return val

# Vectorize over marks
vec_epa = np.vectorize(sample_epa)
epa_per_task = np.zeros_like(final_marks)
for j in range(len(tasks)):
    epa_per_task[:,j] = vec_epa(final_marks[:,j])

# Student’s avg EPA
epa_score = np.round(epa_per_task.mean(axis=1), 2)

# --- 4) BUILD & SAVE DATAFRAME ----
df = pd.DataFrame({
    "id":            np.arange(N),
    "Student":       names,
    "Class":         classes,
    "EPA Score":     epa_score,
    "Latent Ability": np.round(latent, 1),
    **{tasks[j]: final_marks[:,j].round().astype(int) for j in range(len(tasks))}
})

os.makedirs("./data", exist_ok=True)
df.to_csv("./data/students_marks.csv", index=False)
