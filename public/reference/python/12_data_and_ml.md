# 12. Data Science & Machine Learning

> NumPy, pandas, Polars, visualization, Jupyter, scikit-learn — the classical data-science stack.

> Deep learning and LLMs are in `13_deep_learning_and_llms.md`.

---

## Table of Contents

1. [The Stack](#1-the-stack)
2. [NumPy](#2-numpy)
3. [pandas](#3-pandas)
4. [Polars](#4-polars)
5. [Visualization](#5-visualization)
6. [Jupyter](#6-jupyter)
7. [scikit-learn](#7-scikit-learn)
8. [Pipelines and Preprocessing](#8-pipelines-and-preprocessing)
9. [Model Evaluation](#9-model-evaluation)
10. [Hyperparameter Tuning](#10-hyperparameter-tuning)
11. [Gradient Boosting](#11-gradient-boosting)
12. [MLOps Basics](#12-mlops-basics)

---

## 1. The Stack

Python is the dominant language for ML because of its data ecosystem:

```
   NumPy           — multi-dim arrays, fast math
     │
     ├──► pandas    — labeled, mixed-type tabular data
     ├──► Polars    — faster, lazy alternative to pandas
     ├──► SciPy     — scientific computing on NumPy (stats, optimization, signal)
     ├──► matplotlib — plotting
     │    └──► seaborn — statistical viz built on mpl
     │    └──► plotly  — interactive viz
     ├──► scikit-learn — classical ML (everything except deep learning)
     ├──► statsmodels  — classical statistics & econometrics
     ├──► PyTorch / TensorFlow — deep learning (next file)
     ├──► XGBoost / LightGBM    — gradient boosting
     └──► Hugging Face          — pretrained models (next file)
```

In 2026, pandas and NumPy remain the de facto standard. Polars has gained serious traction for performance. scikit-learn is still the answer for any non-deep-learning ML.

---

## 2. NumPy

The foundation. N-dimensional homogeneous arrays with fast vectorized operations.

```bash
pip install numpy
```

```python
import numpy as np

# Create
a = np.array([1, 2, 3, 4])                 # 1D
m = np.array([[1, 2], [3, 4]])              # 2D
np.zeros((3, 4))                             # 3×4 of 0s
np.ones((2, 3))
np.empty((2, 3))                             # uninitialized (faster, danger: random contents)
np.full((2, 3), 7)
np.arange(0, 10, 2)                          # [0, 2, 4, 6, 8]
np.linspace(0, 1, 5)                         # 5 evenly-spaced points: [0, 0.25, ..., 1]
np.random.default_rng(42).normal(size=(3, 3))  # random
np.eye(3)                                     # identity matrix
```

### Properties
```python
a.shape         # (4,)
a.ndim          # 1
a.size          # 4
a.dtype         # dtype('int64')
a.T             # transpose
a.reshape(2, 2)
a.flatten()
```

### Indexing and slicing
```python
a = np.arange(20).reshape(4, 5)
# array([[ 0,  1,  2,  3,  4],
#        [ 5,  6,  7,  8,  9],
#        [10, 11, 12, 13, 14],
#        [15, 16, 17, 18, 19]])

a[0]            # row 0: array([0,1,2,3,4])
a[0, 1]         # scalar 1
a[0][1]         # same — but [0,1] is preferred
a[:, 0]         # first column: [0, 5, 10, 15]
a[1:3, 2:4]     # sub-matrix

# Boolean / fancy indexing
mask = a > 10
a[mask]                          # all elements > 10, flattened
a[a > 10] = 0                    # zero them out
a[[0, 2, 3]]                     # rows 0, 2, 3
```

### Vectorized math (the whole point)
```python
a = np.array([1, 2, 3, 4])
b = np.array([10, 20, 30, 40])

a + b           # element-wise: [11, 22, 33, 44]
a * b           # [10, 40, 90, 160]
a * 2           # [2, 4, 6, 8]   — broadcasting scalar
a ** 2          # [1, 4, 9, 16]

np.sin(a); np.exp(a); np.log(a); np.sqrt(a)

# Aggregations
a.sum(); a.mean(); a.std(); a.min(); a.max()
a.argmin(); a.argmax()
np.median(a)

# 2D aggregations with axis
m.sum()          # all elements
m.sum(axis=0)    # column sums
m.sum(axis=1)    # row sums
```

**No Python `for` loops** — that's the cardinal rule. Vectorized ops are 10-100x faster.

```python
# Slow
result = []
for x in big_array:
    result.append(x ** 2 + 1)

# Fast
result = big_array ** 2 + 1
```

### Broadcasting
NumPy automatically expands smaller arrays to fit larger ones for element-wise ops.

```python
m = np.array([[1, 2, 3], [4, 5, 6]])      # shape (2, 3)
v = np.array([10, 20, 30])                  # shape (3,)
m + v                                        # broadcast → adds v to each row
# [[11, 22, 33], [14, 25, 36]]

col = np.array([[100], [200]])               # shape (2, 1)
m + col                                       # adds 100 to row 0, 200 to row 1
```

Rules: dimensions are compatible if they match or one is 1.

### Matrix operations
```python
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])

a @ b                  # matrix multiplication
a.dot(b)               # same
np.linalg.inv(a)        # inverse
np.linalg.det(a)        # determinant
np.linalg.eig(a)        # eigenvalues, eigenvectors
np.linalg.solve(a, b)   # solve Ax = b
np.linalg.norm(a)       # Frobenius norm
np.linalg.svd(a)        # SVD
```

### Useful tricks
```python
np.where(a > 5, "high", "low")    # element-wise if/else
np.clip(a, 0, 10)                  # clamp values
np.unique(a, return_counts=True)
np.concatenate([a, b])
np.stack([a, b])                   # new dimension
np.vstack([a, b]); np.hstack([a, b])
np.sort(a)
a.cumsum(); a.cumprod()
np.diff(a)                          # element-to-element differences
np.allclose(a, b)                   # approximate equality

# Saving and loading
np.save("a.npy", a)
b = np.load("a.npy")
np.savez("data.npz", x=x, y=y)
data = np.load("data.npz"); data["x"]
```

### When you outgrow NumPy
- Need labeled axes and mixed types → pandas / Polars.
- Need GPU → PyTorch (or `cupy` for NumPy-like GPU arrays).
- Need lazy / out-of-core → Dask, Polars (lazy mode).
- Need sparse → SciPy sparse, or `scipy.sparse`.

---

## 3. pandas

Labeled tabular data. The de facto standard.

```bash
pip install pandas
```

```python
import pandas as pd

# Create
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol"],
    "age":  [30, 25, 35],
    "city": ["NYC", "SF", "LA"],
})

# Series — single column
ages = df["age"]
type(ages)             # pandas.Series
```

### Read and write
```python
df = pd.read_csv("data.csv")
df = pd.read_csv("data.csv", parse_dates=["created_at"], dtype={"id": "int32"})
df = pd.read_parquet("data.parquet")        # very fast for large data
df = pd.read_json("data.json")
df = pd.read_excel("file.xlsx", sheet_name="Sheet1")
df = pd.read_sql("SELECT * FROM users", connection)

df.to_csv("out.csv", index=False)
df.to_parquet("out.parquet")
df.to_json("out.json", orient="records")
```

### Inspect
```python
df.head(); df.tail(10)
df.info()             # types, non-null counts
df.describe()         # summary statistics
df.shape              # (rows, cols)
df.dtypes
df.columns; df.index
df.memory_usage(deep=True)
```

### Selecting
```python
df["age"]                          # single column → Series
df[["name", "age"]]                # multiple columns → DataFrame
df.iloc[0]                         # first row by position → Series
df.iloc[0:3]                        # first 3 rows
df.iloc[0, 1]                       # value at row 0, col 1
df.loc[0]                           # by label (row index = 0 here)
df.loc[df["age"] > 30]              # boolean indexing
df.loc[df["age"] > 30, ["name", "age"]]
df.query("age > 30 and city == 'NYC'")
```

### Adding / transforming columns
```python
df["adult"] = df["age"] >= 18
df["age_squared"] = df["age"] ** 2
df["greeting"] = df["name"].apply(lambda n: f"Hello, {n}")
df["upper_city"] = df["city"].str.upper()
df["initial"] = df["name"].str[0]

# Conditional column
df["category"] = pd.cut(df["age"], bins=[0, 25, 35, 100], labels=["young", "mid", "old"])
df["sign"] = np.where(df["age"] >= 30, "old", "young")
```

### Missing data
```python
df.isna()                     # True/False per cell
df.isna().sum()                # count per column
df.dropna()                    # drop rows with any NaN
df.dropna(subset=["age"])      # only check age
df.fillna(0)                    # fill all NaN
df.fillna({"age": 0, "city": "unknown"})
df["age"].fillna(df["age"].median())   # impute median
```

### Aggregation
```python
df["age"].mean()
df["age"].sum()
df[["age"]].agg(["mean", "median", "std"])

# Group by
df.groupby("city")["age"].mean()
df.groupby("city").agg({"age": "mean", "name": "count"})

# Multiple group columns
df.groupby(["city", "category"]).size()

# Custom aggregation
df.groupby("city")["age"].agg(lambda s: s.quantile(0.75))
```

### Reshaping
```python
# Wide → long
df_long = df.melt(id_vars=["name"], value_vars=["age", "city"])

# Long → wide
df_wide = df_long.pivot(index="name", columns="variable", values="value")

# Pivot table with aggregation
sales.pivot_table(values="amount", index="region", columns="product", aggfunc="sum")
```

### Merging / joining
```python
left = pd.DataFrame({"id": [1, 2, 3], "name": ["A", "B", "C"]})
right = pd.DataFrame({"id": [2, 3, 4], "score": [90, 80, 70]})

pd.merge(left, right, on="id", how="inner")    # default
pd.merge(left, right, on="id", how="left")
pd.merge(left, right, on="id", how="outer")

# Concatenation
pd.concat([df1, df2])                          # stack vertically
pd.concat([df1, df2], axis=1)                  # side by side
```

### Sort
```python
df.sort_values("age")
df.sort_values(["city", "age"], ascending=[True, False])
```

### Apply / transform
```python
df["age"].apply(lambda x: x * 2)
df.apply(lambda row: row["age"] + len(row["name"]), axis=1)

# Vectorize when possible — `.apply` is slow
# Prefer:
df["age"] * 2
```

### Time series
```python
df["created_at"] = pd.to_datetime(df["created_at"])
df.set_index("created_at", inplace=True)

# Resample
df.resample("D")["value"].mean()              # daily mean
df.resample("W")["value"].sum()                # weekly sum

# Rolling window
df["value"].rolling(window=7).mean()           # 7-period moving avg

# Shift
df["lag1"] = df["value"].shift(1)
df["diff"] = df["value"] - df["lag1"]
```

### Performance
- Use parquet, not CSV, for large data.
- Specify `dtype` on read to avoid `object` columns where possible.
- `category` dtype for low-cardinality strings — huge memory savings.
- Pre-filter columns at read time (`usecols=`).
- For >10GB, consider Polars or Dask.

### Common pitfalls
- **`SettingWithCopyWarning`**: chained indexing (`df[df.x > 5]["y"] = ...`) doesn't reliably modify the original. Use `.loc`:
  ```python
  df.loc[df.x > 5, "y"] = 1
  ```
- **`NaN` in integer columns** demotes them to float. Use nullable Int dtype:
  ```python
  df["age"].astype("Int64")    # capital I
  ```
- **`==` with NaN** is always False. Use `.isna()`.
- **Index alignment** — operations align on index; if two Series have different indices, missing values appear.

---

## 4. Polars

Faster, more memory-efficient, Rust-backed alternative to pandas. Gaining a lot of momentum in 2026.

```bash
pip install polars
```

```python
import polars as pl

df = pl.read_csv("data.csv")
df = pl.read_parquet("data.parquet")

# Eager API (looks like pandas)
df.filter(pl.col("age") > 30).select(["name", "city"])

# Lazy API (often faster for big data)
result = (
    pl.scan_parquet("big.parquet")
      .filter(pl.col("age") > 30)
      .group_by("city")
      .agg(pl.col("age").mean())
      .sort("age", descending=True)
      .collect()
)
```

### Why Polars
- 5-30x faster than pandas on many workloads.
- Better memory usage.
- Lazy evaluation — query planner optimizes.
- Cleaner expression-based API once you learn it.
- Built-in parallelism.

### Why still consider pandas
- Vast ecosystem of integrations.
- More documentation/Stack Overflow.
- pandas 2.x has narrowed the speed gap (especially with PyArrow backend).
- Team familiarity.

For new projects with serious data volumes, try Polars. For exploratory work in notebooks, pandas is still very productive.

---

## 5. Visualization

### matplotlib — the baseline
```python
import matplotlib.pyplot as plt

x = [1, 2, 3, 4]
y = [10, 25, 30, 20]

plt.figure(figsize=(8, 5))
plt.plot(x, y, marker="o", label="series A")
plt.title("My chart")
plt.xlabel("X"); plt.ylabel("Y")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("chart.png", dpi=150)
plt.show()
```

### Subplots
```python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].plot(x, y)
axes[0, 1].bar(x, y)
axes[1, 0].scatter(x, y)
axes[1, 1].hist(y, bins=10)
plt.tight_layout()
```

### Object-oriented vs pyplot style
For anything non-trivial, use the OO style (`fig, ax = plt.subplots()`, then `ax.plot(...)`). The `plt.something()` style is global-state-based and harder to compose.

### seaborn — statistical viz on matplotlib
```python
import seaborn as sns
import pandas as pd

tips = sns.load_dataset("tips")
sns.scatterplot(data=tips, x="total_bill", y="tip", hue="time")
sns.boxplot(data=tips, x="day", y="total_bill")
sns.heatmap(corr_matrix, annot=True, cmap="coolwarm")
sns.pairplot(df, hue="category")
```

Much less code than raw matplotlib for common statistical plots.

### plotly — interactive
```python
import plotly.express as px

fig = px.scatter(tips, x="total_bill", y="tip", color="time", size="size")
fig.show()                  # interactive in browser
fig.write_html("plot.html")
```

For dashboards: Plotly Dash, Streamlit, Gradio.

### Streamlit / Gradio — quick web UIs
```bash
pip install streamlit
```

```python
# app.py
import streamlit as st
import pandas as pd

st.title("My dashboard")
df = pd.read_csv("data.csv")
st.dataframe(df)

city = st.selectbox("City", df["city"].unique())
st.bar_chart(df[df["city"] == city].set_index("date")["value"])
```

```bash
streamlit run app.py
```

Streamlit is perfect for internal data tools. Gradio for ML model demos.

---

## 6. Jupyter

Notebook environment for interactive analysis.

```bash
pip install jupyterlab
jupyter lab
```

### Cell types
- **Code cells** — run Python.
- **Markdown cells** — write prose, headers, math (LaTeX with `$ $`).
- **Raw cells** — for exporting to other formats.

### Magic commands
```python
%timeit sum(range(1000))
%%timeit
total = 0
for i in range(1000):
    total += i

%%writefile script.py
print("hello")

%matplotlib inline       # inline plots (default in JupyterLab)
%load_ext autoreload
%autoreload 2             # auto-reload imported modules on save
%env DEBUG=1
%who                       # list variables
```

### Best practices
- **Don't write your library in a notebook.** Keep code in `.py` files; use the notebook for exploration and reports.
- **Restart and run all** before sharing — hidden state from out-of-order execution is a notebook's #1 footgun.
- **Pin versions** if the notebook is important.
- Use **`nbstripout`** in git to strip output before commit.
- Consider **Papermill** for parameterized notebook execution and **nbconvert** to export to HTML/PDF.

### Alternatives
- **Marimo** — newer reactive notebook that solves the out-of-order execution problem.
- **Observable Python** — web-first notebooks.
- **VS Code notebooks** — `.ipynb` editing inside VS Code is excellent.

---

## 7. scikit-learn

Classical machine learning. Linear models, trees, ensembles, clustering, dimensionality reduction.

```bash
pip install scikit-learn
```

### The standard pattern
Every estimator follows the same API:
```python
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100, max_depth=10)
model.fit(X_train, y_train)
predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)
score = model.score(X_test, y_test)        # accuracy for classifiers
```

`fit` learns parameters. `predict` uses them. `score` evaluates. Same API for everything: logistic regression, KNN, neural networks, gradient boosting, clustering.

### Train/test split
```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
```

### Common algorithms

| Task | Algorithms |
|---|---|
| Classification | `LogisticRegression`, `RandomForestClassifier`, `GradientBoostingClassifier`, `SVC`, `KNeighborsClassifier`, `MLPClassifier`, `XGBClassifier` (XGBoost) |
| Regression | `LinearRegression`, `Ridge`, `Lasso`, `RandomForestRegressor`, `GradientBoostingRegressor`, `SVR`, `XGBRegressor` |
| Clustering | `KMeans`, `DBSCAN`, `AgglomerativeClustering`, `GaussianMixture` |
| Dim reduction | `PCA`, `TSNE`, `UMAP` (external lib `umap-learn`) |
| Anomaly detection | `IsolationForest`, `OneClassSVM`, `LocalOutlierFactor` |

### Example: classification end-to-end
```python
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

# Load
df = pd.read_csv("data.csv")
X = df.drop("target", axis=1)
y = df["target"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Pipeline = preprocessing + model
pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)),
])

# Cross-validation
scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring="f1_macro")
print(f"CV F1: {scores.mean():.3f} ± {scores.std():.3f}")

# Train on full training set
pipe.fit(X_train, y_train)

# Test
y_pred = pipe.predict(X_test)
print(classification_report(y_test, y_pred))
print(confusion_matrix(y_test, y_pred))
```

---

## 8. Pipelines and Preprocessing

### Why pipelines
- Chain preprocessing + model so you can fit/predict/CV the whole thing as a unit.
- No risk of fitting on test data ("leakage").
- Easier to serialize and deploy.

### `ColumnTransformer` for mixed types
```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

numeric_features = ["age", "income"]
categorical_features = ["city", "job"]

preprocessor = ColumnTransformer([
    ("num", Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ]), numeric_features),
    ("cat", Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore")),
    ]), categorical_features),
])

pipe = Pipeline([
    ("prep", preprocessor),
    ("clf", LogisticRegression(max_iter=1000)),
])
pipe.fit(X_train, y_train)
```

### Common preprocessors
- `StandardScaler` — zero mean, unit variance.
- `MinMaxScaler` — scale to [0, 1].
- `RobustScaler` — uses median/IQR (good when outliers).
- `OneHotEncoder` — categorical → binary columns.
- `OrdinalEncoder` — categorical → integers.
- `SimpleImputer`, `KNNImputer` — fill missing values.
- `PolynomialFeatures` — generate interaction terms.
- `TfidfVectorizer`, `CountVectorizer` — for text.

---

## 9. Model Evaluation

### Classification metrics
```python
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, log_loss, classification_report, confusion_matrix
)

# Use precision/recall/F1 when classes are imbalanced — accuracy is misleading.
precision_score(y_true, y_pred, average="macro")
recall_score(y_true, y_pred, average="weighted")
f1_score(y_true, y_pred, average="macro")
roc_auc_score(y_true, y_proba)            # for probabilistic predictions
```

### Regression metrics
```python
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    mean_absolute_percentage_error, root_mean_squared_error
)
```

### Cross-validation
```python
from sklearn.model_selection import cross_val_score, KFold, StratifiedKFold

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X, y, cv=cv, scoring="f1_macro", n_jobs=-1)
```

### Time-series split
For time-series data, don't shuffle:
```python
from sklearn.model_selection import TimeSeriesSplit
cv = TimeSeriesSplit(n_splits=5)
```

### Common evaluation mistakes
- **Data leakage** — fitting any preprocessing on combined train+test data. Always fit on train only, transform test.
- **Leakage via features** — including a feature that wouldn't be available at prediction time in reality.
- **Imbalanced classes ignored** — 95% accuracy on 95/5 split is useless. Use stratification, class weights, or oversampling (SMOTE).
- **Holding out for tuning** — if you tune hyperparameters via CV on the training set, you still need a separate held-out test set.

---

## 10. Hyperparameter Tuning

### Grid search
```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    "clf__n_estimators": [100, 200, 500],
    "clf__max_depth": [5, 10, 20, None],
}

grid = GridSearchCV(pipe, param_grid, cv=5, scoring="f1_macro", n_jobs=-1)
grid.fit(X_train, y_train)
print(grid.best_params_, grid.best_score_)

# Use the best model
best_model = grid.best_estimator_
```

### Random search (often better than grid)
```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform

dist = {
    "clf__n_estimators": randint(50, 500),
    "clf__max_depth": randint(3, 30),
    "clf__min_samples_leaf": randint(1, 20),
}
rs = RandomizedSearchCV(pipe, dist, n_iter=50, cv=5, n_jobs=-1)
rs.fit(X_train, y_train)
```

### Bayesian optimization (smarter)
```bash
pip install optuna
```

```python
import optuna

def objective(trial):
    n = trial.suggest_int("n_estimators", 50, 500)
    d = trial.suggest_int("max_depth", 3, 30)
    pipe.set_params(clf__n_estimators=n, clf__max_depth=d)
    return cross_val_score(pipe, X_train, y_train, cv=5, scoring="f1_macro").mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
study.best_params
```

Optuna is excellent for non-trivial search spaces.

---

## 11. Gradient Boosting

For tabular data, gradient boosting trees usually win.

### XGBoost
```bash
pip install xgboost
```

```python
import xgboost as xgb

model = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="auc",
    early_stopping_rounds=20,
    tree_method="hist",         # fast
    device="cuda",              # GPU if available
)
model.fit(X_train, y_train, eval_set=[(X_test, y_test)])

xgb.plot_importance(model)
```

### LightGBM
```bash
pip install lightgbm
```

```python
import lightgbm as lgb
model = lgb.LGBMClassifier(n_estimators=500, learning_rate=0.05, num_leaves=63)
model.fit(X_train, y_train, eval_set=[(X_val, y_val)], callbacks=[lgb.early_stopping(20)])
```

LightGBM is often faster than XGBoost; XGBoost is sometimes more accurate. Try both.

### CatBoost
```bash
pip install catboost
```

Handles categorical features natively without one-hot encoding. Often very competitive out of the box.

### When to use which
- Tabular data: gradient boosting first (XGBoost / LightGBM / CatBoost).
- High-cardinality categoricals: CatBoost.
- Need speed at huge scale: LightGBM.
- Mature, broad community: XGBoost.

Deep learning is rarely better than gradient boosting for tabular data unless you have very large datasets (>100k rows) and complex interactions.

---

## 12. MLOps Basics

### Saving and loading models
```python
import joblib

joblib.dump(model, "model.pkl")
loaded = joblib.load("model.pkl")
```

`joblib` is the standard for scikit-learn models (faster than pickle for NumPy arrays). For PyTorch/TF, use their native methods.

### Reproducibility
- Set `random_state=42` (or any fixed seed) everywhere.
- Pin library versions in `pyproject.toml`.
- Save the exact training data hash / version.
- Log hyperparameters and metrics — use MLflow, Weights & Biases, or a homegrown table.

### Experiment tracking
```bash
pip install mlflow
```

```python
import mlflow
mlflow.set_experiment("my-classifier")

with mlflow.start_run():
    mlflow.log_params({"n_estimators": 200, "max_depth": 10})
    model.fit(X_train, y_train)
    score = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", score)
    mlflow.sklearn.log_model(model, "model")
```

### Feature stores
For larger orgs: Feast, Tecton, Hopsworks. For small teams: a Parquet file on S3 or a Postgres table.

### Model serving
- **REST API**: wrap the model in FastAPI; load once at startup.
- **Batch scoring**: schedule a job that reads new records, predicts, writes results.
- **Streaming**: Kafka consumer that scores each event.
- **Edge**: convert to ONNX or TFLite for mobile/embedded.

### Model monitoring
Track in production:
- **Input drift** — distribution of features changing over time.
- **Output drift** — distribution of predictions changing.
- **Performance drift** — when ground truth eventually arrives, are metrics still good?
- **Data quality** — null rates, schema violations, out-of-range values.

Tools: Evidently, Arize, WhyLabs, or built into model platforms.

---

Next: deep learning, transformers, and LLMs in `13_deep_learning_and_llms.md`.
