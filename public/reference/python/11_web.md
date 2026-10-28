# 11. Web Development

> FastAPI, Flask, Django, Pydantic, authentication patterns, middleware, and deployment.

---

## Table of Contents

1. [Choosing a Framework](#1-choosing-a-framework)
2. [Pydantic — The Data Layer](#2-pydantic--the-data-layer)
3. [FastAPI](#3-fastapi)
4. [Flask](#4-flask)
5. [Django](#5-django)
6. [Authentication](#6-authentication)
7. [Middleware and Cross-Cutting Concerns](#7-middleware-and-cross-cutting-concerns)
8. [Background Jobs](#8-background-jobs)
9. [Testing Web Apps](#9-testing-web-apps)
10. [Deployment](#10-deployment)

---

## 1. Choosing a Framework

| Framework | Best for | Key traits |
|---|---|---|
| **FastAPI** | Modern APIs, async-heavy, type-driven | Async-first, auto OpenAPI/Swagger, Pydantic-native. The default choice in 2026 for new APIs. |
| **Flask** | Small services, tools, simple sites | Tiny core, "pick your own batteries". Sync. Mature. |
| **Django** | Full-stack apps with auth + admin + ORM | Batteries-included. ORM, admin panel, auth, forms. Best when you need a CMS-style app. |
| **Litestar** | FastAPI-like, more opinionated | Worth a look if FastAPI doesn't fit. |
| **Starlette** | Building your own framework on top | What FastAPI is built on. |
| **Tornado / Sanic / aiohttp** | Specific async use cases | Older async frameworks, niche. |

For new APIs in 2026: FastAPI. For a content-driven site with admin and auth: Django. For a tiny utility: Flask is still fine.

---

## 2. Pydantic — The Data Layer

Pydantic isn't a framework — it's a data validation library. But it's so central to modern Python web work (FastAPI, SQLModel, LangChain, etc.) that it belongs here first.

```bash
pip install pydantic
```

```python
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

class User(BaseModel):
    id: int
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr                          # requires `pip install pydantic[email]`
    age: int | None = Field(default=None, ge=0, le=150)
    tags: list[str] = []
    created_at: datetime

    @field_validator("name")
    @classmethod
    def name_must_not_be_admin(cls, v):
        if v.lower() == "admin":
            raise ValueError("'admin' is reserved")
        return v


# Parse from a dict (e.g., JSON body)
data = {"id": 1, "name": "Alice", "email": "a@x.com", "created_at": "2026-01-01T00:00:00"}
user = User(**data)        # validates and coerces

# To dict / JSON
user.model_dump()
user.model_dump_json()

# From JSON
User.model_validate_json('{"id": 1, ...}')
```

### Key features
- **Type coercion** — strings turn into ints, ISO strings into datetimes, etc.
- **Validation** — bad input raises `ValidationError` with detailed messages.
- **Nested models** — fields can themselves be Pydantic models.
- **Custom validators** — runs your code during validation.
- **Settings** — `pydantic-settings` loads config from env/files.

### Common patterns
```python
# Optional fields
class Item(BaseModel):
    name: str
    description: str | None = None
    in_stock: bool = True

# Constrained types
from pydantic import conint, constr, conlist
class Order(BaseModel):
    qty: conint(gt=0, le=100)
    code: constr(pattern=r"^[A-Z]{2}-\d{4}$")

# Nested
class Address(BaseModel):
    city: str
    zip: str

class Person(BaseModel):
    name: str
    addresses: list[Address]

# From ORM objects
class UserOut(BaseModel):
    model_config = {"from_attributes": True}   # was: orm_mode in v1
    id: int
    name: str

# Settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    debug: bool = False
    model_config = {"env_file": ".env"}

settings = Settings()
```

Pydantic v2 (current as of 2026) is much faster than v1, written partly in Rust.

---

## 3. FastAPI

The current default for new Python APIs. Built on Starlette (async) + Pydantic (validation).

```bash
pip install "fastapi[standard]"     # includes uvicorn, httpx, etc.
```

### Hello world
```python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "hello"}
```

Run:
```bash
fastapi dev main.py
# or:
uvicorn main:app --reload
```

Open http://localhost:8000 and http://localhost:8000/docs for the auto-generated Swagger UI.

### Path and query parameters
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"id": item_id, "query": q}

# /items/5?q=hello → {"id": 5, "query": "hello"}
```

Type hints drive both validation and OpenAPI generation. `item_id: int` automatically rejects non-numeric paths with a 422 response.

### Request bodies
```python
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    price: float
    in_stock: bool = True

@app.post("/items/")
def create_item(item: ItemCreate):
    return {"created": item.name, "price_with_tax": item.price * 1.1}
```

Validation, JSON parsing, OpenAPI schema — all from the type hint.

### Response models
```python
class ItemOut(BaseModel):
    id: int
    name: str

@app.post("/items/", response_model=ItemOut)
def create_item(item: ItemCreate):
    # save to DB...
    return {"id": 42, "name": item.name, "price": item.price}   # extra fields stripped
```

### Async endpoints
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.fetch_user(user_id)
    return user
```

Mix sync and async freely. FastAPI runs sync endpoints in a thread pool so they don't block the event loop.

### Dependency injection
```python
from fastapi import Depends, Header, HTTPException

def get_current_user(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ")
    user = decode_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="invalid token")
    return user

@app.get("/me")
def me(user = Depends(get_current_user)):
    return user
```

Dependencies are first-class. They run before the endpoint, can have their own dependencies, can yield (like context managers for cleanup), and are testable via overrides.

### Routers (organizing larger apps)
```python
# routers/users.py
from fastapi import APIRouter
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{id}")
def get_user(id: int): ...

# main.py
from fastapi import FastAPI
from routers import users, posts
app = FastAPI()
app.include_router(users.router)
app.include_router(posts.router)
```

### Error handling
```python
from fastapi import HTTPException

@app.get("/items/{id}")
def get_item(id: int):
    item = db.get(id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# Custom exception handlers
from fastapi import Request
from fastapi.responses import JSONResponse

class MyError(Exception):
    def __init__(self, msg): self.msg = msg

@app.exception_handler(MyError)
def my_error_handler(request: Request, exc: MyError):
    return JSONResponse(status_code=400, content={"error": exc.msg})
```

### Middleware
```python
@app.middleware("http")
async def add_process_time_header(request, call_next):
    import time
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - start:.3f}"
    return response
```

### CORS
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

### File uploads
```python
from fastapi import UploadFile

@app.post("/upload")
async def upload(file: UploadFile):
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}
```

### WebSockets
```python
from fastapi import WebSocket

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    while True:
        msg = await ws.receive_text()
        await ws.send_text(f"echo: {msg}")
```

### Background tasks
```python
from fastapi import BackgroundTasks

def send_email(to: str, subject: str):
    ...

@app.post("/signup")
def signup(email: str, tasks: BackgroundTasks):
    tasks.add_task(send_email, email, "welcome!")
    return {"ok": True}
```

For anything beyond fire-and-forget, use a proper job queue (Celery, RQ, Dramatiq).

### Lifespan events (startup/shutdown)
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.db_pool = await create_pool()
    yield
    # shutdown
    await app.state.db_pool.close()

app = FastAPI(lifespan=lifespan)
```

### Server
FastAPI doesn't include a server — you use `uvicorn` (asyncio, fast) or `hypercorn` (also supports HTTP/2). For production, run behind a reverse proxy (nginx, Caddy) or load balancer.

---

## 4. Flask

The micro-framework. Single file to start, expand as needed.

```bash
pip install flask
```

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def root():
    return "hello"

@app.route("/items/<int:item_id>")
def get_item(item_id):
    return jsonify({"id": item_id})

@app.route("/items", methods=["POST"])
def create_item():
    data = request.get_json()
    # ... save to DB ...
    return jsonify(data), 201

if __name__ == "__main__":
    app.run(debug=True)
```

### Blueprints — organize routes
```python
from flask import Blueprint

api = Blueprint("api", __name__, url_prefix="/api")

@api.route("/users")
def list_users(): ...

app.register_blueprint(api)
```

### Templates (Jinja2)
```python
from flask import render_template

@app.route("/")
def home():
    return render_template("home.html", name="Alice")
```

```html
<!-- templates/home.html -->
<h1>Hello, {{ name }}</h1>
{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
```

### Flask extensions
A flask app is often = Flask + chosen extensions:
- **Flask-SQLAlchemy** — ORM integration.
- **Flask-Login** — session auth.
- **Flask-Migrate** — wraps Alembic.
- **Flask-WTF** — forms with CSRF.
- **Flask-RESTful** / **Flask-RESTX** / **APIFlask** — API helpers.
- **Flask-CORS** — CORS support.

### When Flask still wins
- Single-file scripts that need an HTTP endpoint.
- Server-side templated apps (FastAPI can do this too, but Flask's pattern is well-trodden).
- Teams familiar with Flask.

For new pure-API work in 2026, FastAPI is generally the easier path.

---

## 5. Django

A batteries-included framework. ORM, admin, auth, forms, templating — everything included.

```bash
pip install django
django-admin startproject mysite
cd mysite
python manage.py startapp blog
```

### Models (`blog/models.py`)
```python
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    author = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
```

```bash
python manage.py makemigrations
python manage.py migrate
```

### Admin (`blog/admin.py`)
```python
from django.contrib import admin
from .models import Post
admin.site.register(Post)
```

After `python manage.py createsuperuser`, log in at `/admin` — you get a full CRUD UI for Post automatically.

### Views and URLs
```python
# blog/views.py
from django.shortcuts import render, get_object_or_404
from .models import Post

def post_list(request):
    posts = Post.objects.all()
    return render(request, "blog/post_list.html", {"posts": posts})

def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    return render(request, "blog/post_detail.html", {"post": post})
```

```python
# blog/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.post_list, name="post-list"),
    path("<int:pk>/", views.post_detail, name="post-detail"),
]
```

### Django REST Framework
For APIs in Django, use DRF.
```bash
pip install djangorestframework
```

```python
from rest_framework import serializers, viewsets

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["id", "title", "body", "author", "created_at"]

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
```

Hook it into URLs via a router; you get full REST CRUD with one class.

### When Django wins
- Multi-user web app with auth, admin, forms, sessions.
- Teams that want a clear convention over flexibility.
- Content-heavy sites (blogs, dashboards, internal tools).
- Long-lived projects with stable requirements.

For modern async APIs or microservices, FastAPI is usually simpler.

---

## 6. Authentication

### JWT tokens (most common for APIs)
```bash
pip install "python-jose[cryptography]" passlib[bcrypt]
```

```python
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

SECRET = "..."
ALGO = "HS256"
pwd = CryptContext(schemes=["bcrypt"])

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, hashed: str) -> bool:
    return pwd.verify(p, hashed)

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)

def decode_token(token: str) -> int:
    payload = jwt.decode(token, SECRET, algorithms=[ALGO])
    return int(payload["sub"])
```

In FastAPI, wire this into a dependency that reads the `Authorization: Bearer ...` header.

### OAuth2 / OIDC
For "Login with Google/GitHub/etc.", use:
- **`authlib`** — works with most frameworks.
- **`fastapi-users`** — full user auth solution for FastAPI.
- **External identity provider** — Auth0, Clerk, Supabase Auth, Cognito.

Rolling your own OAuth flow is rarely worth it. Use a library or service.

### Session-based auth (server-stored sessions)
Standard for Django and many Flask apps. Cookie ID maps to a session record on the server. Built into Django; for Flask use `Flask-Login`.

### API keys
Simplest authentication for server-to-server APIs. Issue a long random string; check on each request. Don't roll your own crypto — `secrets.token_urlsafe(32)` is plenty.

### Storing passwords
Always hash with a slow KDF: bcrypt (well-supported), argon2 (modern, recommended), scrypt. Never store plaintext. Never use MD5/SHA1/SHA256 directly for passwords.

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
```

---

## 7. Middleware and Cross-Cutting Concerns

Common middleware concerns:
- **Logging** — request method, path, status, latency.
- **CORS** — already covered.
- **Authentication** — extract user from token/header into request state.
- **Rate limiting** — `slowapi` (FastAPI), `flask-limiter`, or in front of the app (nginx, API Gateway).
- **Compression** — `GZipMiddleware` in FastAPI / Django.
- **Tracing** — OpenTelemetry instrumentation.
- **Error reporting** — Sentry SDK.
- **Security headers** — Content-Security-Policy, X-Frame-Options, etc. (`secure` library).

Middleware runs per request, so keep it fast.

---

## 8. Background Jobs

For work that doesn't fit in a request:
- **Celery** — the heavyweight. Tasks, scheduling, retries, distributed workers, Redis or RabbitMQ broker.
- **RQ** — simpler, Redis-only.
- **Dramatiq** — middle-ground; good defaults; Redis/RabbitMQ.
- **APScheduler** — for scheduling within one process.
- **Cron / Kubernetes CronJob** — for periodic tasks.

```python
# celery example
from celery import Celery
app = Celery("myapp", broker="redis://localhost:6379/0")

@app.task
def send_email(to, subject, body):
    ...
```

```python
# In a request handler
send_email.delay("a@x.com", "hi", "...")     # queued, returns immediately
```

### When background jobs aren't enough
For long-running data jobs, workflows, retries: look at Prefect, Dagster, Airflow, Temporal. Different tradeoffs; outside the scope here.

---

## 9. Testing Web Apps

### FastAPI
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"message": "hello"}
```

### Flask
```python
def test_index(client):     # `client` is a fixture from app.test_client()
    r = client.get("/")
    assert r.status_code == 200
```

### Django
Django has its own `TestCase` (transaction-rolled-back) and `Client`:
```python
from django.test import TestCase, Client

class PostTests(TestCase):
    def test_list(self):
        c = Client()
        r = c.get("/")
        self.assertEqual(r.status_code, 200)
```

More on testing in `14_testing_and_quality.md`.

---

## 10. Deployment

### Servers
- **Uvicorn** — async, used for FastAPI / Starlette / async Django.
- **Gunicorn** — sync, used for Flask / Django. Can manage Uvicorn workers (`gunicorn -k uvicorn.workers.UvicornWorker`).
- **Hypercorn** — alt to Uvicorn, supports HTTP/2.
- **Granian** — Rust-based, growing in adoption for performance.

Typical command:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

Worker count = roughly `(2 × CPU cores) + 1` for I/O-heavy apps.

### Containers
Standard Dockerfile:
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev

COPY . .
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

For production, multi-stage builds keep images smaller.

### Reverse proxy
Put nginx, Caddy, Traefik, or a managed load balancer in front. Reasons:
- TLS termination.
- Connection limits and queueing.
- Serve static files faster than Python can.
- Multiple apps on one host.

### Platforms
Best fits in 2026:
- **Fly.io, Railway, Render** — easy app deploys.
- **AWS Lambda** + **Mangum** — FastAPI as serverless.
- **Google Cloud Run / Cloud Functions** — container-based serverless.
- **Kubernetes** — for fleets at scale.
- **Vercel / Netlify Functions** — for tiny APIs adjacent to a frontend.

### Static files & frontends
For "API + JS frontend", keep them separate: deploy the JS as static (Vercel, Cloudflare Pages, S3+CloudFront) and the Python API independently. Communicate via REST or gRPC over the network.

### Observability
- **Logs**: structured (JSON), shipped to a service (Datadog, Loki, Cloudwatch).
- **Metrics**: Prometheus + Grafana, or a hosted equivalent.
- **Traces**: OpenTelemetry SDK + Jaeger/Honeycomb/Datadog.
- **Errors**: Sentry SDK.

The Python SDKs for all these are mature; instrument from day one if it's going to production.

---

That's the web stack. Next: the reason many people use Python in the first place — data and ML — in `12_data_and_ml.md`.
