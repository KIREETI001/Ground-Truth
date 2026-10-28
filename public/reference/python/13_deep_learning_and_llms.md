# 13. Deep Learning & LLMs

> PyTorch, TensorFlow, Hugging Face Transformers, LLM API clients, RAG, vector databases, agent frameworks. This is where Python earns its position as the AI lingua franca.

---

## Table of Contents

1. [The Deep Learning Stack](#1-the-deep-learning-stack)
2. [PyTorch — Core Concepts](#2-pytorch--core-concepts)
3. [Building Neural Networks in PyTorch](#3-building-neural-networks-in-pytorch)
4. [Training Loops](#4-training-loops)
5. [Datasets and DataLoaders](#5-datasets-and-dataloaders)
6. [PyTorch Lightning](#6-pytorch-lightning)
7. [TensorFlow / Keras](#7-tensorflow--keras)
8. [Hugging Face Transformers](#8-hugging-face-transformers)
9. [Tokenizers and Embeddings](#9-tokenizers-and-embeddings)
10. [LLM API Clients](#10-llm-api-clients)
11. [Retrieval-Augmented Generation (RAG)](#11-retrieval-augmented-generation-rag)
12. [Vector Databases](#12-vector-databases)
13. [Agent Frameworks](#13-agent-frameworks)
14. [Deployment and Serving](#14-deployment-and-serving)

---

## 1. The Deep Learning Stack

```
PyTorch (dominant in research, growing in prod)
    │
    ├──► torchvision / torchaudio / torchtext      — domain libs
    ├──► PyTorch Lightning                          — training boilerplate
    ├──► Hugging Face Transformers                  — pretrained models
    ├──► Hugging Face Accelerate                    — multi-GPU/TPU made easier
    └──► torch.compile (PyTorch 2.x)                — JIT compilation

TensorFlow / Keras (still big in production, especially Google)
    │
    ├──► Keras 3 (multi-backend: TF, JAX, PyTorch)
    └──► TFX                                         — production pipelines

JAX (research; functional, XLA-backed)
    ├──► Flax / Equinox / Haiku                     — NN layers
    └──► Optax                                       — optimizers

LLM-specific
    ├──► OpenAI / Anthropic / Cohere SDKs           — API clients
    ├──► vLLM, TGI, llama.cpp, Ollama                — inference servers
    ├──► LangChain, LlamaIndex, Haystack             — orchestration
    └──► DSPy, Instructor                            — structured LLM programming
```

**In 2026**, PyTorch is the de facto choice for new ML work. TensorFlow remains common in established teams and at Google. JAX is a research-focused option with serious adoption.

---

## 2. PyTorch — Core Concepts

```bash
pip install torch
# For CUDA: visit pytorch.org for the exact install command for your CUDA version
```

```python
import torch

# Tensors — like NumPy arrays, but on GPU and with autograd
x = torch.tensor([1.0, 2.0, 3.0])
x = torch.zeros(3, 4)
x = torch.ones(2, 2)
x = torch.randn(3, 3)                      # standard normal
x = torch.arange(10)
x = torch.from_numpy(np_array)              # zero-copy from NumPy

x.shape; x.dtype; x.device
x.size(0); x.numel()
```

### Devices
```python
device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")

x = torch.randn(1000, 1000).to(device)     # send to GPU
y = torch.randn(1000, 1000, device=device)  # create on GPU

# Move back to CPU for NumPy interop
x.cpu().numpy()
```

`mps` is Apple Silicon GPU. `cuda` is NVIDIA. ROCm for AMD has a parallel API.

### Autograd — automatic differentiation
```python
x = torch.tensor([2.0], requires_grad=True)
y = x ** 2 + 3 * x + 1
y.backward()                # compute dy/dx
x.grad                       # tensor([7.])  (= 2x + 3 at x=2)
```

Every operation builds a graph. `backward()` walks it backward computing gradients. This is the heart of training neural networks.

### Common tensor operations
```python
a = torch.randn(2, 3)
b = torch.randn(2, 3)

a + b; a * b; a @ b.T                  # element-wise and matrix mul
torch.matmul(a, b.T)
a.sum(); a.mean(); a.std(); a.max()
a.sum(dim=0); a.sum(dim=1, keepdim=True)
a.view(3, 2)                            # reshape
a.permute(1, 0)                          # transpose general
a.unsqueeze(0); a.squeeze(0)            # add/remove dim
torch.cat([a, b], dim=0)
torch.stack([a, b])
a.detach()                               # remove from autograd graph
a.requires_grad_(True)                    # enable grad
```

### NumPy vs PyTorch — what's different?
- Tensors live on devices; NumPy arrays are CPU-only.
- Tensors support autograd.
- Most names are the same (`sum`, `mean`, etc.) but a few aren't (`view` vs `reshape`, `permute` vs `transpose`).
- Use `.item()` to extract a Python scalar from a 0-d tensor.

---

## 3. Building Neural Networks in PyTorch

### `nn.Module` — the base class
```python
import torch.nn as nn
import torch.nn.functional as F

class MyMLP(nn.Module):
    def __init__(self, in_dim, hidden_dim, out_dim):
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, out_dim)
        self.dropout = nn.Dropout(0.2)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        return self.fc3(x)

model = MyMLP(784, 256, 10)
print(model)
sum(p.numel() for p in model.parameters())     # count params
```

### Sequential — for simple stacks
```python
model = nn.Sequential(
    nn.Linear(784, 256), nn.ReLU(), nn.Dropout(0.2),
    nn.Linear(256, 256), nn.ReLU(),
    nn.Linear(256, 10),
)
```

### Common layers
- `nn.Linear(in, out)` — fully connected.
- `nn.Conv2d(in_ch, out_ch, kernel_size)` — 2D conv.
- `nn.LSTM`, `nn.GRU`, `nn.RNN`.
- `nn.MultiheadAttention` — transformer attention.
- `nn.TransformerEncoder`, `nn.TransformerDecoder`.
- `nn.Embedding(num_emb, emb_dim)`.
- `nn.BatchNorm1d/2d`, `nn.LayerNorm`.
- `nn.Dropout`, `nn.GELU`, `nn.ReLU`, `nn.Softmax`.

### Functional vs module form
- `nn.ReLU()` — a module you store and call.
- `F.relu(x)` — a function. No state, fine for stateless ops.

Use modules when state matters (`nn.Dropout`, `nn.BatchNorm`); functional is fine for activation functions.

### Loss functions
```python
loss_fn = nn.CrossEntropyLoss()       # classification
loss_fn = nn.MSELoss()                  # regression
loss_fn = nn.BCEWithLogitsLoss()        # binary classification (with logits)
loss_fn = nn.L1Loss()                   # MAE
```

### Optimizers
```python
import torch.optim as optim

optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
optimizer = optim.SGD(model.parameters(), lr=1e-2, momentum=0.9)
optimizer = optim.AdamW(model.parameters(), lr=3e-4)     # most common for transformers
```

### Learning rate schedulers
```python
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)
scheduler = optim.lr_scheduler.OneCycleLR(optimizer, max_lr=1e-3, total_steps=1000)
```

---

## 4. Training Loops

### The canonical PyTorch loop
```python
model = MyMLP(784, 256, 10).to(device)
optimizer = optim.AdamW(model.parameters(), lr=1e-3)
loss_fn = nn.CrossEntropyLoss()

for epoch in range(num_epochs):
    model.train()
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)

        optimizer.zero_grad()                  # clear old gradients
        logits = model(x)                       # forward
        loss = loss_fn(logits, y)
        loss.backward()                          # backprop
        optimizer.step()                          # update weights

    # Validation
    model.eval()
    correct = 0; total = 0
    with torch.no_grad():
        for x, y in val_loader:
            x, y = x.to(device), y.to(device)
            preds = model(x).argmax(dim=1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    print(f"epoch {epoch}: val acc = {correct / total:.3f}")
```

### What each piece does
- `model.train()` / `model.eval()` — toggle dropout / batchnorm behavior.
- `optimizer.zero_grad()` — gradients accumulate by default; clear them each batch.
- `loss.backward()` — compute gradients via autograd.
- `optimizer.step()` — apply gradient update.
- `torch.no_grad()` — don't track gradients (faster, less memory) when evaluating.

### Mixed precision (faster on modern GPUs)
```python
scaler = torch.cuda.amp.GradScaler()

for x, y in train_loader:
    x, y = x.to(device), y.to(device)
    optimizer.zero_grad()

    with torch.autocast(device_type="cuda", dtype=torch.float16):
        logits = model(x)
        loss = loss_fn(logits, y)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

### Gradient clipping (for unstable training)
```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```

### Saving and loading
```python
# State dict — the recommended way
torch.save(model.state_dict(), "model.pt")
model = MyMLP(...)
model.load_state_dict(torch.load("model.pt", map_location=device))

# Full checkpoint for resuming training
torch.save({
    "epoch": epoch,
    "model": model.state_dict(),
    "optimizer": optimizer.state_dict(),
    "scheduler": scheduler.state_dict(),
}, "checkpoint.pt")
```

### `torch.compile` (PyTorch 2.0+) — JIT for big speedups
```python
model = torch.compile(model)
```
Often 1.5-2x faster with no other changes.

---

## 5. Datasets and DataLoaders

```python
from torch.utils.data import Dataset, DataLoader

class MyDataset(Dataset):
    def __init__(self, features, labels):
        self.x = torch.tensor(features, dtype=torch.float32)
        self.y = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.x)

    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]


train_set = MyDataset(X_train, y_train)
train_loader = DataLoader(
    train_set,
    batch_size=64,
    shuffle=True,
    num_workers=4,            # parallel data loading
    pin_memory=True,           # faster GPU transfer
    drop_last=True,
)
```

### `num_workers` and worker spawn
On Linux with `fork`, `num_workers > 0` is essentially free. On Windows / macOS, watch out for `if __name__ == "__main__":` guard requirements.

### Built-in datasets
```python
from torchvision import datasets, transforms

transform = transforms.Compose([
    transforms.Resize(224),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

train = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
```

`torchaudio` and `torchtext` provide similar utilities for audio and text.

---

## 6. PyTorch Lightning

Eliminates the boilerplate.

```bash
pip install lightning
```

```python
import lightning as L
from torch import nn, optim
import torch.nn.functional as F

class LitMLP(L.LightningModule):
    def __init__(self, in_dim, hidden, out_dim):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, out_dim),
        )

    def forward(self, x):
        return self.model(x)

    def training_step(self, batch, batch_idx):
        x, y = batch
        logits = self(x)
        loss = F.cross_entropy(logits, y)
        self.log("train_loss", loss)
        return loss

    def validation_step(self, batch, batch_idx):
        x, y = batch
        logits = self(x)
        loss = F.cross_entropy(logits, y)
        acc = (logits.argmax(dim=1) == y).float().mean()
        self.log_dict({"val_loss": loss, "val_acc": acc})

    def configure_optimizers(self):
        return optim.AdamW(self.parameters(), lr=1e-3)


model = LitMLP(784, 256, 10)
trainer = L.Trainer(max_epochs=10, accelerator="auto", devices="auto")
trainer.fit(model, train_loader, val_loader)
```

Lightning handles device placement, mixed precision, multi-GPU, logging, checkpointing, gradient accumulation — none of it your problem.

Worth using as soon as your training loop has more than ~30 lines or you need multi-GPU.

### Hugging Face Accelerate — alternative
Similar goal: makes vanilla PyTorch loops work on multi-GPU/TPU with minimal change.

```python
from accelerate import Accelerator
accelerator = Accelerator()
model, optimizer, train_loader = accelerator.prepare(model, optimizer, train_loader)

for x, y in train_loader:
    optimizer.zero_grad()
    loss = loss_fn(model(x), y)
    accelerator.backward(loss)
    optimizer.step()
```

---

## 7. TensorFlow / Keras

Still widely used, especially in production at large companies.

```bash
pip install tensorflow
```

### Keras Sequential
```python
import tensorflow as tf
from tensorflow.keras import layers, models

model = models.Sequential([
    layers.Dense(256, activation="relu", input_shape=(784,)),
    layers.Dropout(0.2),
    layers.Dense(128, activation="relu"),
    layers.Dense(10, activation="softmax"),
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

model.fit(X_train, y_train, epochs=10, batch_size=64, validation_split=0.1)
model.evaluate(X_test, y_test)
preds = model.predict(X_new)
model.save("model.keras")
```

### Keras 3 (multi-backend)
Keras 3 (2024+) supports TensorFlow, JAX, and PyTorch as backends. Same Keras API, runtime of your choice.
```bash
pip install keras
# Set backend
import os; os.environ["KERAS_BACKEND"] = "jax"      # or "tensorflow" or "torch"
import keras
```

### When to choose TF / Keras
- Existing TF codebase.
- Production with TensorFlow Serving, TFLite, TensorFlow.js.
- Google Cloud / Vertex AI tight integration.
- You prefer Keras' more declarative style.

For most new research/prototyping in 2026: PyTorch. For production stability with Google infra: TensorFlow.

---

## 8. Hugging Face Transformers

The way most people use pretrained models — language, vision, audio.

```bash
pip install transformers
```

### Inference: `pipeline` (easiest)
```python
from transformers import pipeline

# Text classification
classifier = pipeline("sentiment-analysis")
classifier("I love this product!")
# [{'label': 'POSITIVE', 'score': 0.999}]

# Question answering
qa = pipeline("question-answering")
qa(question="Where did she go?", context="She went to Paris last summer.")

# Generation
gen = pipeline("text-generation", model="meta-llama/Llama-3.2-3B-Instruct")
gen("Explain quantum computing in one sentence:", max_new_tokens=100)

# Translation
trans = pipeline("translation_en_to_fr")
trans("Hello, how are you?")

# Image classification
img = pipeline("image-classification", model="google/vit-base-patch16-224")
img("https://example.com/cat.jpg")

# Automatic speech recognition
asr = pipeline("automatic-speech-recognition", model="openai/whisper-base")
asr("audio.wav")
```

### Manual: load model + tokenizer
```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_name = "meta-llama/Llama-3.2-3B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",        # auto-place on GPU(s)
)

prompt = "Explain photosynthesis in one paragraph."
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=200, do_sample=True, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### Fine-tuning with `Trainer`
```python
from transformers import (
    AutoModelForSequenceClassification, AutoTokenizer,
    TrainingArguments, Trainer,
)
from datasets import load_dataset

tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased", num_labels=2
)

ds = load_dataset("imdb")
def tok(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=256)
ds = ds.map(tok, batched=True)

args = TrainingArguments(
    output_dir="./output",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    num_train_epochs=3,
    eval_strategy="epoch",
    save_strategy="epoch",
    fp16=True,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=ds["train"],
    eval_dataset=ds["test"],
)
trainer.train()
trainer.evaluate()
```

### PEFT and LoRA for cheap fine-tuning
Full fine-tuning of a 7B-parameter model needs ~70GB of GPU RAM. **LoRA** trains tiny adapter matrices instead, dropping memory usage 10-50x.

```bash
pip install peft
```

```python
from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()   # < 1% of total
```

Combined with 4-bit / 8-bit quantization (via `bitsandbytes`), you can fine-tune large models on a single consumer GPU. This is "QLoRA".

### `datasets` library
Hugging Face's `datasets` package is the de facto data abstraction for NLP/audio/vision pipelines:
```python
from datasets import load_dataset, Dataset

ds = load_dataset("imdb")
ds = load_dataset("csv", data_files="local.csv")
ds = Dataset.from_pandas(df)

ds["train"][0]
ds.map(transform_fn, batched=True)
ds.filter(lambda ex: len(ex["text"]) > 100)
ds.train_test_split(test_size=0.2)
```

Backed by Apache Arrow — memory-mapped, fast, scales beyond RAM.

---

## 9. Tokenizers and Embeddings

### Tokenizers
A tokenizer maps text to integer IDs that models understand. Different models use different tokenizers (BPE, WordPiece, SentencePiece).

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("bert-base-uncased")

tok.tokenize("Hello, world!")
# ['hello', ',', 'world', '!']

ids = tok.encode("Hello, world!", return_tensors="pt")
# tensor([[101, 7592, 1010, 2088, 999, 102]])
# 101 and 102 are [CLS] and [SEP] special tokens

decoded = tok.decode(ids[0])
# "[CLS] hello, world! [SEP]"

# Batch encoding for training
batch = tok(["First sentence.", "Second."], padding=True, truncation=True, max_length=128, return_tensors="pt")
batch["input_ids"]; batch["attention_mask"]
```

### Embeddings — text → vector
For semantic search, clustering, RAG.

```bash
pip install sentence-transformers
```

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
# Lightweight (80MB), 384-dim embeddings — good default for many use cases

embeddings = model.encode(["Hello world", "Goodbye world"])
embeddings.shape       # (2, 384)

# Semantic similarity
from sentence_transformers.util import cos_sim
cos_sim(embeddings[0], embeddings[1])
```

Other notable embedding models:
- `BAAI/bge-large-en-v1.5` — strong open-source embedding.
- `BAAI/bge-m3` — multilingual.
- OpenAI `text-embedding-3-small` / `text-embedding-3-large` — API-based.
- Cohere `embed-v3.0` — API-based.
- Voyage AI — API-based, often top of MTEB benchmarks.

### Choosing an embedding model
| Need | Pick |
|---|---|
| Self-hosted, lightweight | `all-MiniLM-L6-v2` (384d) |
| Self-hosted, higher quality | `bge-large-en-v1.5` (1024d) |
| Multilingual | `bge-m3` |
| API, cheap and good | OpenAI `text-embedding-3-small` |
| Top benchmarks | Voyage or Cohere v3 |

Always check the [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) for current rankings.

---

## 10. LLM API Clients

### OpenAI
```bash
pip install openai
```

```python
from openai import OpenAI

client = OpenAI()    # reads OPENAI_API_KEY from env

# Chat completion
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What's the capital of France?"},
    ],
    temperature=0.3,
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku about Python."}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)

# Embeddings
embedding_resp = client.embeddings.create(
    model="text-embedding-3-small",
    input=["Hello world", "Goodbye world"],
)
vectors = [d.embedding for d in embedding_resp.data]
```

### Anthropic
```bash
pip install anthropic
```

```python
import anthropic

client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY

response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain quantum computing in one paragraph."},
    ],
)
print(response.content[0].text)

# Streaming
with client.messages.stream(
    model="claude-opus-4-7",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Tell me a story."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Tool / function calling
Both OpenAI and Anthropic support letting the LLM call your functions:

```python
# OpenAI
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Singapore?"}],
    tools=tools,
)

call = response.choices[0].message.tool_calls[0]
fn_name = call.function.name
fn_args = json.loads(call.function.arguments)
# Run get_weather(**fn_args), feed result back in another message
```

### Structured outputs
The cleanest way to get JSON from an LLM:

```python
# OpenAI structured outputs via Pydantic
from pydantic import BaseModel

class Sentiment(BaseModel):
    label: str
    confidence: float
    explanation: str

response = client.chat.completions.parse(
    model="gpt-4o",
    messages=[{"role": "user", "content": f"Analyze: '{text}'"}],
    response_format=Sentiment,
)
result: Sentiment = response.choices[0].message.parsed
```

For Anthropic, use tool use with a single "submit" tool, or use libraries like `instructor`.

### `instructor` — Pydantic-based for any provider
```bash
pip install instructor
```

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel

client = instructor.from_openai(OpenAI())

class Person(BaseModel):
    name: str
    age: int
    email: str

p = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=Person,
    messages=[{"role": "user", "content": "Extract: Alice is 30, alice@x.com"}],
)
print(p.name, p.age, p.email)
```

Includes retries on validation failure. Works with OpenAI, Anthropic, Cohere, Gemini, local models via Ollama, etc.

### Open-source local models via Ollama
```bash
# Install Ollama (https://ollama.com), then:
ollama run llama3
```

```python
# Then in Python, the Ollama API speaks OpenAI-compatible:
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
client.chat.completions.create(
    model="llama3",
    messages=[{"role": "user", "content": "Hi"}],
)
```

Same code works for OpenAI-cloud and local. Useful for privacy, cost, or offline work.

---

## 11. Retrieval-Augmented Generation (RAG)

The pattern: given a question, retrieve relevant documents from your data, then prompt the LLM with those documents as context. Lets you "ground" LLM answers in your knowledge base.

### Basic flow
```
Documents → Chunks → Embeddings → Vector DB
                                       │
User query → Embedding → Top-K search ─┤
                                       ▼
                              [Context + Query] → LLM → Answer
```

### Minimal RAG from scratch
```python
from sentence_transformers import SentenceTransformer
import numpy as np
from openai import OpenAI

embedder = SentenceTransformer("all-MiniLM-L6-v2")
client = OpenAI()

# Index
docs = [
    "Python was created by Guido van Rossum.",
    "Python 3 was released in 2008.",
    "PyTorch is a deep learning framework.",
    # ...
]
doc_embeddings = embedder.encode(docs)   # shape (N, 384)

def retrieve(query, k=3):
    q_emb = embedder.encode([query])[0]
    sims = doc_embeddings @ q_emb / (np.linalg.norm(doc_embeddings, axis=1) * np.linalg.norm(q_emb))
    top_idx = np.argsort(sims)[::-1][:k]
    return [docs[i] for i in top_idx]

def rag_answer(query):
    context = "\n".join(retrieve(query))
    prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

print(rag_answer("Who created Python?"))
```

### What makes RAG hard in practice
1. **Chunking** — how to split documents? Too short = no context; too long = noise. Try 500-1000 tokens with some overlap.
2. **Embedding quality** — bad embeddings = bad retrieval. Try multiple embedding models.
3. **Hybrid search** — combine semantic (embeddings) with lexical (BM25). Often better than either alone.
4. **Reranking** — retrieve top-50, rerank with a cross-encoder, keep top-5. Big quality jump.
5. **Metadata filters** — restrict by source, date, user permissions.
6. **Evaluation** — RAGAS, custom eval sets. Don't fly blind.

### Production-quality libraries
- **LlamaIndex** — RAG-first framework with strong abstractions for indexing and querying.
- **LangChain** — general LLM orchestration, including RAG.
- **Haystack** — pipeline-oriented framework from deepset.
- **RAGFlow, R2R** — turnkey RAG platforms.

```python
# LlamaIndex example
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

docs = SimpleDirectoryReader("./docs").load_data()
index = VectorStoreIndex.from_documents(docs)
query_engine = index.as_query_engine()
print(query_engine.query("What does the document say about X?"))
```

---

## 12. Vector Databases

For RAG at any non-trivial scale, you need a vector database. Options:

| DB | Hosted | Self-hosted | Notes |
|---|---|---|---|
| **Pinecone** | ✅ | ❌ | Managed, fast, simple |
| **Weaviate** | ✅ | ✅ | Schema-aware, hybrid search |
| **Qdrant** | ✅ | ✅ | Rust, fast, generous free tier |
| **Chroma** | (paid SaaS coming) | ✅ | Easiest local-first; great for prototyping |
| **Milvus** | ✅ | ✅ | Battle-tested at scale |
| **pgvector** | (use any Postgres) | ✅ | Postgres extension — keep one DB for everything |
| **OpenSearch / Elasticsearch** | ✅ | ✅ | If you already run them |
| **LanceDB** | — | ✅ | Embedded, file-based |

### Chroma (easiest local start)
```bash
pip install chromadb
```

```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("docs")

collection.add(
    documents=["doc 1", "doc 2", "doc 3"],
    metadatas=[{"source": "a"}, {"source": "b"}, {"source": "a"}],
    ids=["1", "2", "3"],
)

results = collection.query(
    query_texts=["what is doc 1 about?"],
    n_results=2,
    where={"source": "a"},
)
```

Chroma handles embeddings automatically (with a default model). For production, pass your own embedding function.

### pgvector
For teams already on Postgres, this is often the best choice — no second database to operate.
```sql
CREATE EXTENSION vector;
CREATE TABLE docs (id serial PRIMARY KEY, content text, embedding vector(384));
CREATE INDEX ON docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Query
SELECT content FROM docs ORDER BY embedding <=> $1 LIMIT 5;
```

From Python: regular Postgres driver + `pgvector-python`.

### Pinecone
```bash
pip install pinecone
```

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="...")
pc.create_index(
    name="docs", dimension=384, metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)
index = pc.Index("docs")

index.upsert([
    ("1", embedding1, {"source": "a"}),
    ("2", embedding2, {"source": "b"}),
])

results = index.query(vector=query_embedding, top_k=5, include_metadata=True)
```

### Choosing
- **Prototyping / small scale**: Chroma (local) or pgvector.
- **Already on Postgres**: pgvector.
- **High-scale managed**: Pinecone, Weaviate Cloud, Qdrant Cloud.
- **Hybrid search built-in**: Weaviate, OpenSearch.
- **Open-source self-hosted at scale**: Qdrant, Milvus.

---

## 13. Agent Frameworks

"Agent" = LLM in a loop that can call tools, observe results, and decide next steps.

### LangChain / LangGraph
The most-used (and most-criticized) framework. LangGraph (newer) is the graph-based agent builder.

```bash
pip install langgraph langchain langchain-openai
```

```python
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """Get weather for a city."""
    return f"It's sunny in {city}."

@tool
def search_docs(query: str) -> str:
    """Search the knowledge base."""
    return "Some retrieved context..."

agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o"),
    tools=[get_weather, search_docs],
)

result = agent.invoke({"messages": [{"role": "user", "content": "What's the weather in Tokyo?"}]})
print(result["messages"][-1].content)
```

### LlamaIndex agents
Strong for RAG-heavy agents.

### Smolagents (Hugging Face), CrewAI, AutoGen
Various opinionated takes on multi-agent orchestration. Worth a look if LangGraph doesn't fit.

### DSPy — "programming, not prompting"
A different paradigm — define inputs and outputs, let DSPy optimize the prompts.
```bash
pip install dspy
```

```python
import dspy
dspy.configure(lm=dspy.LM("openai/gpt-4o-mini"))

class QA(dspy.Signature):
    """Answer the question based on context."""
    context = dspy.InputField()
    question = dspy.InputField()
    answer = dspy.OutputField()

qa = dspy.ChainOfThought(QA)
result = qa(context="...", question="...")
```

Useful when prompts are getting unwieldy.

### Custom agents
Don't underestimate writing your own loop:
```python
def agent_loop(user_message, tools):
    messages = [{"role": "user", "content": user_message}]
    for _ in range(10):       # max steps
        response = client.chat.completions.create(
            model="gpt-4o", messages=messages, tools=tools,
        )
        choice = response.choices[0]
        if choice.finish_reason == "stop":
            return choice.message.content
        if choice.message.tool_calls:
            messages.append(choice.message)
            for call in choice.message.tool_calls:
                result = execute_tool(call.function.name, call.function.arguments)
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": result,
                })
    return "Max steps reached"
```

For simple agents, this is often clearer and more debuggable than a framework. Frameworks shine when you need streaming, multi-step planning, human-in-the-loop, persistence, or multi-agent.

---

## 14. Deployment and Serving

### Inference servers for open-source LLMs
- **vLLM** — highest throughput. Production standard for hosting LLaMA/Mistral/Qwen on GPUs.
- **TGI** (Text Generation Inference, by HF) — similar, also production-quality.
- **llama.cpp / Ollama** — CPU-friendly, quantized models. Great for local.
- **TensorRT-LLM** — NVIDIA's highest-performance option (more setup).
- **MLC LLM** — for mobile / edge.

```bash
# vLLM example
pip install vllm
python -m vllm.entrypoints.openai.api_server --model meta-llama/Llama-3.1-8B-Instruct
```

The server speaks an OpenAI-compatible API, so client code stays the same.

### General PyTorch model serving
- **TorchServe** — official, declining popularity.
- **BentoML** — flexible, Python-first.
- **Ray Serve** — for complex pipelines, scaling.
- **Triton Inference Server** — NVIDIA, supports any framework.
- **Cog / Modal / Replicate** — managed serverless GPU.
- **FastAPI in front of a loaded model** — perfectly fine for low-traffic cases.

### Model formats
- **PyTorch native** — `.pt` / `.pth` state_dicts.
- **ONNX** — cross-framework. Run on `onnxruntime` (CPU/GPU, faster than native PyTorch for many cases).
- **TorchScript** — JIT-compiled PyTorch.
- **TensorRT** — NVIDIA-optimized.
- **GGUF** — quantized format for llama.cpp / Ollama.

### Quantization (smaller, faster models)
- **8-bit / 4-bit** with `bitsandbytes` — easy, works on most HF models.
- **GPTQ / AWQ** — post-training quantization, better quality than naive int4.
- **GGUF** — for CPU/Apple Silicon inference via llama.cpp.

A 7B LLM at fp16 needs 14GB; at int4 it fits in 4GB. Quality loss is often surprisingly small.

### Cost considerations
LLM inference is expensive. Knobs:
- **Smaller models** when possible (GPT-4o-mini vs GPT-4o, Claude Haiku vs Sonnet).
- **Caching** — cache common prompts/responses (both providers support prompt caching).
- **Batching** — group concurrent requests if latency allows.
- **Quantization** for self-hosted.
- **Right-size context** — don't send 50k tokens when 2k suffices.

### Observability
For LLM apps specifically:
- **LangSmith** (LangChain) — traces, evals.
- **Langfuse** — open-source LLM observability.
- **Weights & Biases Weave** — traces + evals.
- **OpenTelemetry** — works with any of these via instrumentation.

You want to log every prompt, response, latency, token count, model version, and outcome. Without this you have no way to debug regressions.

---

That's the deep learning and LLM stack. Real production work also involves evals (don't ship without them), red-teaming, prompt management, and version control of prompts as carefully as code — topics on their own.

Next: keeping all of this from breaking — `14_testing_and_quality.md`.
