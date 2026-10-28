# 11. Frontend Frameworks

> React, Next.js, Vue, Svelte, Astro — the four most relevant frontend ecosystems in 2026.

> This is an orientation file. Each framework has hundreds of pages of docs. The goal here: pick one, understand the model, know the next thing to look up.

---

## Table of Contents

1. [Choosing a Framework](#1-choosing-a-framework)
2. [React](#2-react)
3. [Next.js](#3-nextjs)
4. [Vue](#4-vue)
5. [Svelte / SvelteKit](#5-svelte--sveltekit)
6. [Astro](#6-astro)
7. [State Management](#7-state-management)
8. [Data Fetching](#8-data-fetching)
9. [Forms](#9-forms)
10. [Styling](#10-styling)
11. [Routing](#11-routing)
12. [What I'd Pick in 2026](#12-what-id-pick-in-2026)

---

## 1. Choosing a Framework

| Framework | When |
|---|---|
| **React** | Largest hiring pool, biggest ecosystem. Many libraries assume React. Use via Next.js, Remix, or as a SPA. |
| **Next.js** | Production-grade React framework with server components, file-based routing, deployment baked in. The default React stack. |
| **Vue** | Cleaner API than React, gentler learning curve. Strong in Asian markets. |
| **Svelte** / **SvelteKit** | Compiler-based; smaller bundles, less boilerplate. Growing fast. |
| **Astro** | Content-driven sites (blogs, docs, marketing). Ships zero JS by default. Components can be React/Vue/Svelte. |
| **SolidJS, Qwik** | Smaller communities but innovative — Solid has React-like syntax with fine-grained reactivity; Qwik streams resumability. Worth knowing exist. |
| **HTMX + server templates** | Not a JS framework — but worth knowing about. Server-rendered HTML + small JS for interactivity. Reduces JS complexity dramatically. |

For a new project in 2026: **Next.js** if you need full-stack React; **Astro** for content sites; **SvelteKit** if you've tried it and want less JS in your bundles.

---

## 2. React

The dominant frontend library.

### Mental model
- **Components** are functions that return JSX.
- **State** in `useState` triggers re-renders.
- **Effects** in `useEffect` synchronize with external systems.
- React re-renders the component subtree when state changes; the virtual DOM diff updates the real DOM.

### Components
```jsx
function Greeting({ name, age }) {
    return <h1>Hello, {name} (age {age})</h1>;
}

// Or arrow
const Greeting = ({ name, age }) => <h1>Hello, {name}</h1>;

// Usage
<Greeting name="Alice" age={30} />
```

### JSX
JSX compiles to `React.createElement` (or a JSX runtime call). Looks like HTML, behaves like JS:
```jsx
<div className="card" onClick={() => alert("hi")}>
    <h2>{title}</h2>
    {items.map(item => <p key={item.id}>{item.text}</p>)}
    {isActive && <span>Active</span>}
    {count > 0 ? <Badge count={count} /> : null}
</div>
```

Rules:
- `className`, not `class`.
- `htmlFor`, not `for`.
- camelCase event handlers: `onClick`, `onChange`.
- Self-close tags: `<input />`.
- Lists need a stable `key` prop.

### State: `useState`
```jsx
import { useState } from "react";

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

Functional update for when you depend on previous state:
```jsx
setCount(c => c + 1);
```

### Effects: `useEffect`
```jsx
import { useEffect } from "react";

function User({ id }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/users/${id}`)
            .then(r => r.json())
            .then(data => {
                if (!cancelled) setUser(data);
            });
        return () => { cancelled = true; };       // cleanup
    }, [id]);                                       // re-run when id changes

    if (!user) return <p>Loading...</p>;
    return <p>{user.name}</p>;
}
```

### Other hooks worth knowing
- **`useRef`** — mutable value that doesn't trigger re-renders. Often used for DOM refs.
- **`useMemo`** — memoize an expensive computation.
- **`useCallback`** — memoize a function (so children don't re-render).
- **`useContext`** — read from a Context.
- **`useReducer`** — alternative to `useState` for complex state.
- **`useTransition`** — mark updates as non-urgent.
- **`useDeferredValue`** — defer a value's update.
- **`useId`** — unique ID for accessibility.

### Custom hooks
```jsx
function useDebouncedValue(value, ms) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return debounced;
}

function Search() {
    const [query, setQuery] = useState("");
    const debounced = useDebouncedValue(query, 300);
    useEffect(() => {
        if (debounced) fetch(`/search?q=${debounced}`);
    }, [debounced]);
    ...
}
```

Hook rules: only call at the top of components or other hooks; only call in the same order every render.

### Context — sharing state without prop drilling
```jsx
const ThemeContext = createContext("light");

function App() {
    return (
        <ThemeContext.Provider value="dark">
            <Toolbar />
        </ThemeContext.Provider>
    );
}

function Button() {
    const theme = useContext(ThemeContext);
    return <button className={theme}>Click</button>;
}
```

For larger app state, reach for Zustand / Jotai / Redux Toolkit instead of using Context for everything.

### Server Components (React 19+, Next.js 13+)
A new component type that runs on the server only:
```jsx
// app/users/page.jsx — Server Component
import { db } from "@/db";

export default async function UsersPage() {
    const users = await db.user.findMany();
    return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

Server Components:
- Can be async — `await` directly.
- Have direct access to the database, filesystem, secrets.
- Their JS doesn't ship to the client (smaller bundles).
- Can't use `useState`, `useEffect`, or browser APIs.

Client Components (the traditional kind) need `"use client";` at the top:
```jsx
"use client";

import { useState } from "react";

export function Counter() { ... }
```

### Lifecycle and concurrent rendering
React 18/19 introduced concurrent rendering — updates can be interrupted, deferred, or scheduled. Mostly invisible; you'll occasionally use `startTransition` or `useDeferredValue` for non-urgent updates.

```jsx
import { startTransition } from "react";

startTransition(() => {
    setFilter(newFilter);     // marked low-priority — UI stays responsive
});
```

---

## 3. Next.js

The dominant React framework. By 2026, very few people start a React project without Next or Remix.

### What Next gives you
- **File-based routing** — folders in `app/` become routes.
- **Server Components by default**.
- **API routes** — server endpoints next to your pages.
- **SSR / SSG / ISR** — pre-render or render on demand.
- **Built-in optimizations** — images, fonts, scripts.
- **Middleware** — auth, redirects, A/B testing at the edge.

### Starting a project
```bash
npx create-next-app@latest
```

### App router structure
```
app/
├── layout.tsx               # root layout (wraps all pages)
├── page.tsx                  # home page (/)
├── about/
│   └── page.tsx              # /about
├── posts/
│   ├── page.tsx               # /posts
│   └── [id]/
│       └── page.tsx            # /posts/:id
└── api/
    └── users/
        └── route.ts            # GET /api/users etc.
```

### A page
```jsx
// app/posts/[id]/page.tsx
import { getPost } from "@/lib/db";

export default async function PostPage({ params }) {
    const { id } = await params;            // params is now async (Next 15+)
    const post = await getPost(id);

    if (!post) notFound();

    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.body}</p>
        </article>
    );
}
```

### A layout
```jsx
// app/layout.tsx
export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <header><Nav /></header>
                <main>{children}</main>
                <footer>...</footer>
            </body>
        </html>
    );
}
```

Nested layouts compose — `app/dashboard/layout.tsx` wraps everything under `/dashboard`.

### API routes
```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
    const users = await db.user.findMany();
    return NextResponse.json(users);
}

export async function POST(request) {
    const body = await request.json();
    const user = await db.user.create({ data: body });
    return NextResponse.json(user, { status: 201 });
}
```

### Server Actions
Forms can call server functions directly, no API endpoint needed:
```jsx
// app/actions.ts
"use server";
export async function createPost(formData) {
    const title = formData.get("title");
    await db.post.create({ data: { title } });
}

// app/new/page.tsx
import { createPost } from "../actions";
export default function NewPostPage() {
    return (
        <form action={createPost}>
            <input name="title" />
            <button>Create</button>
        </form>
    );
}
```

### Data fetching strategies
- **Static (SSG)** — pages rendered at build time. Default for non-dynamic content.
- **Dynamic** — rendered per request when using cookies, headers, etc.
- **ISR** — static, regenerated on a schedule:
  ```jsx
  export const revalidate = 60;     // revalidate every 60 seconds
  ```
- **Streaming** — wrap parts of a page in Suspense; they stream in as they're ready.

### Image and font optimization
```jsx
import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

<Image src="/photo.jpg" alt="..." width={800} height={600} priority />
```

### Deployment
Vercel (made by Next authors) — zero config. Or self-host on any Node-capable runtime. Builds produce a Node server and static assets.

---

## 4. Vue

Cleaner API than React. Strong typography ecosystem (Nuxt, Pinia, VueUse). Major version: Vue 3.

### Component (Single-File Component)
```vue
<!-- Greeting.vue -->
<script setup>
import { ref, computed } from "vue";

const count = ref(0);
const double = computed(() => count.value * 2);

function increment() {
    count.value++;
}
</script>

<template>
    <button @click="increment">
        Count: {{ count }}, double: {{ double }}
    </button>
</template>

<style scoped>
button { padding: 8px 16px; }
</style>
```

Three sections: `<script>`, `<template>`, `<style>` — co-located, scoped CSS.

### Reactivity: `ref` and `reactive`
```javascript
const count = ref(0);           // primitive — access via .value
count.value++;

const user = reactive({         // object — access directly
    name: "Alice",
    age: 30,
});
user.age++;
```

In the template, `.value` is unwrapped automatically.

### Composables (Vue's hooks)
```javascript
// useDebounced.js
import { ref, watch } from "vue";

export function useDebounced(value, ms) {
    const debounced = ref(value.value);
    let timeout;
    watch(value, (newVal) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => debounced.value = newVal, ms);
    });
    return debounced;
}
```

### Template directives
```vue
<button @click="handler">Click</button>            <!-- event -->
<input v-model="text" />                            <!-- two-way binding -->
<p v-if="show">Visible</p>                          <!-- conditional -->
<p v-else>Hidden</p>
<li v-for="item in items" :key="item.id">           <!-- loop -->
    {{ item.name }}
</li>
<div :class="{ active: isActive }">                  <!-- conditional class -->
```

### Nuxt — the Next.js for Vue
```bash
npx nuxi@latest init my-app
```

Provides SSR, file-based routing, modules, auto-imports, deployment integrations. Like Next.js, but for Vue.

---

## 5. Svelte / SvelteKit

Compiler-based. Looks like writing plain HTML/CSS/JS with small additions; the compiler generates minimal runtime code.

### Component
```svelte
<!-- Counter.svelte -->
<script>
    let count = $state(0);             // Svelte 5 runes syntax
    let double = $derived(count * 2);

    function increment() { count++; }
</script>

<button on:click={increment}>
    Count: {count}, double: {double}
</button>

<style>
    button { padding: 8px 16px; }
</style>
```

### Reactivity (Svelte 5)
Svelte 5 introduced "runes" — magic functions:
- `$state(initial)` — reactive variable.
- `$derived(expr)` — computed value.
- `$effect(() => ...)` — side effect.
- `$props()` — declare component props.

Pre-Svelte 5 used implicit reactivity (`let count = 0` was automatically reactive). New code uses runes.

### Why Svelte
- Smaller bundles than React (no virtual DOM runtime).
- Less boilerplate.
- HTML is HTML — no JSX.
- Built-in animations, transitions, stores.

### SvelteKit
The Next-equivalent for Svelte. File-based routing, SSR, API routes, deploy adapters for Node / Vercel / Cloudflare / static.
```bash
npm create svelte@latest my-app
```

### Adoption note
Svelte's community is smaller than React's. Hiring may be harder, fewer libraries assume Svelte. Worth a try for personal projects or teams that value the DX.

---

## 6. Astro

A framework for **content-driven** websites — blogs, docs, marketing pages, e-commerce catalogues.

### Mental model
- Pages are mostly static HTML, generated at build time.
- Interactive components only ship JS where needed ("islands").
- Components can be React / Vue / Svelte / Preact / Solid — Astro is framework-agnostic.

### A page
```astro
---
// front-matter — runs at build time
const posts = await fetch("https://api.example.com/posts").then(r => r.json());
---

<html>
    <body>
        <h1>Blog</h1>
        {posts.map(post => (
            <article>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
            </article>
        ))}
    </body>
</html>
```

### Islands of interactivity
```astro
---
import Counter from "../components/Counter.tsx";       // React
import Search from "../components/Search.vue";         // Vue
---

<Counter client:load />          <!-- hydrate immediately -->
<Search client:idle />            <!-- hydrate when idle -->
<Chat client:visible />            <!-- hydrate when scrolled into view -->
```

By default, even interactive components ship no JS — they render to HTML at build time. The `client:*` directive opts into hydration.

### When Astro wins
- Marketing sites, blogs, docs.
- Static-mostly with sprinkles of interactivity.
- Bundles down to almost nothing JS-wise.

### When it doesn't
- Heavy interactivity throughout (use Next/SvelteKit).
- Real-time / collaborative apps (Astro doesn't focus on this).

---

## 7. State Management

### Local state — built-in
- React: `useState`, `useReducer`, `useContext`.
- Vue: `ref`, `reactive`, `provide`/`inject`.
- Svelte: `$state` runes.

### Global state libraries (when local + context isn't enough)
- **Zustand** (React) — minimal, popular. Pick this first.
- **Jotai** (React) — atomic, derived state.
- **Redux Toolkit** (React) — when you need time-travel, devtools, middleware. Less hated than classic Redux.
- **TanStack Store** (framework-agnostic) — newer, lean.
- **Pinia** (Vue) — official Vuex successor.
- **Svelte stores** — built-in `writable`, `readable`, `derived`.

### Zustand example
```javascript
import { create } from "zustand";

const useCounterStore = create((set) => ({
    count: 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
    reset: () => set({ count: 0 }),
}));

// In a component
function Counter() {
    const { count, increment } = useCounterStore();
    return <button onClick={increment}>{count}</button>;
}
```

### URL state
Often, state belongs in the URL, not in JS memory:
- Filters, sort options, page numbers → query params.
- Easy to share, survives reload, gives back/forward semantics free.

---

## 8. Data Fetching

### TanStack Query (React Query)
The de facto standard for fetching server data:
```bash
npm install @tanstack/react-query
```

```jsx
import { useQuery } from "@tanstack/react-query";

function UserProfile({ id }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["user", id],
        queryFn: () => fetch(`/users/${id}`).then(r => r.json()),
        staleTime: 60_000,
    });

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;
    return <p>{data.name}</p>;
}
```

Built-in caching, deduping, background refetch, optimistic updates. Almost always worth pulling in even for small apps.

### SWR — alternative, lighter
Similar API, made by Vercel.

### Native to the framework
- Next.js Server Components — `await` directly.
- Remix — `loader` functions.
- Vue Nuxt — `useFetch`.
- SvelteKit — `load` functions.

For client-side data after the initial render, all these frameworks recommend TanStack Query or similar.

### tRPC — typesafe RPC end-to-end
If your front and back are both TypeScript:
```typescript
// server
export const appRouter = router({
    user: router({
        get: publicProcedure
            .input(z.object({ id: z.number() }))
            .query(({ input }) => db.user.findUnique({ where: { id: input.id } })),
    }),
});

// client
const user = await trpc.user.get.query({ id: 1 });  // fully typed
```

Eliminates an entire class of API drift bugs. Pairs nicely with TanStack Query.

---

## 9. Forms

Form libraries vary by framework. Common standalone choices:

### React Hook Form (React)
```bash
npm install react-hook-form zod @hookform/resolvers
```

```jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

function LoginForm() {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        await fetch("/login", { method: "POST", body: JSON.stringify(data) });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register("email")} />
            {errors.email && <p>{errors.email.message}</p>}
            <input type="password" {...register("password")} />
            <button type="submit">Login</button>
        </form>
    );
}
```

Fast (uncontrolled inputs), good DX. Standard pick for React forms.

### Other options
- **TanStack Form** — framework-agnostic, type-safe.
- **Formik** — older React option, less recommended for new code.
- **VeeValidate** — for Vue.
- **Svelte's Superforms** — for SvelteKit.

### Validation libraries
- **Zod** — most popular in 2026. TypeScript-first.
- **Valibot** — smaller, tree-shakable alternative.
- **Yup** — older, still common.
- **ArkType** — newer, TS-native syntax.

These work both client and server side. Often you share the schema between front and back.

---

## 10. Styling

Many viable approaches:

### Tailwind CSS — dominant in 2026
Utility classes in markup.
```jsx
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
    Click
</button>
```

Pros: no separate CSS file, design system encoded in classes, easy to tweak.
Cons: HTML gets verbose. Components abstract the classes — `<Button>` instead of repeating them.

Setup is usually a postcss step; with Vite/Next/etc., it's pre-configured by their CLIs.

### CSS Modules
Locally-scoped CSS:
```css
/* Button.module.css */
.primary { background: blue; }
```

```jsx
import styles from "./Button.module.css";
<button className={styles.primary}>Click</button>
```

### CSS-in-JS
- **styled-components**, **emotion** — popular but losing ground in SSR/RSC era.
- **vanilla-extract** — type-safe, zero-runtime CSS-in-JS.
- **Stitches**, **Linaria** — alternatives.

### Component libraries
- **shadcn/ui** — copy-paste components built on Radix UI + Tailwind. Most popular in 2026.
- **Radix UI** — unstyled accessible primitives.
- **Material UI**, **Mantine**, **Chakra UI** — pre-styled component sets.
- **Headless UI**, **Ariakit** — accessible primitives.

For new projects: **Tailwind + shadcn/ui** is the dominant 2026 choice for React apps that need polished UI fast.

---

## 11. Routing

- **Next.js / Nuxt / SvelteKit / Astro** — file-based, framework-built-in.
- **React Router** (now part of Remix) — the SPA standard for React.
- **TanStack Router** — type-safe React router. Growing.
- **Vue Router**, **Solid Router**, etc. — framework-specific.

For SPAs in 2026, **TanStack Router** is the type-safety leader. For full-stack apps, framework routing wins.

---

## 12. What I'd Pick in 2026

Given a new web project:

| Project | Stack |
|---|---|
| Full-stack app, React experience | **Next.js + Tailwind + shadcn/ui + Drizzle + TanStack Query** |
| Content site (blog, docs) | **Astro + Tailwind** |
| SPA-only (e.g., internal tool) | **Vite + React + TanStack Router + TanStack Query** |
| Less JS, simpler model | **SvelteKit** |
| Vue shop | **Nuxt 3 + Pinia + Tailwind** |
| Static / cheap deploy | **Astro on Cloudflare Pages** |

Don't agonize. The choice matters less than execution. Pick something with a clear migration path and ship.

Next: the server side of these apps — `12_backend.md`.
