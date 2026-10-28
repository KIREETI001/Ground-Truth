# 13 — Game development with Unity

Unity is the dominant use of C# outside enterprise. This chapter covers the engine's mental model, scripting essentials, and patterns that scale beyond a tutorial project.

## Table of Contents
- [Why Unity for C#](#why-unity-for-c)
- [Engine mental model](#engine-mental-model)
- [MonoBehaviour: the script lifecycle](#monobehaviour-the-script-lifecycle)
- [GameObjects and components](#gameobjects-and-components)
- [Transforms](#transforms)
- [Input](#input)
- [Time, FixedUpdate, and Update](#time-fixedupdate-and-update)
- [Physics](#physics)
- [Coroutines](#coroutines)
- [Prefabs and instantiation](#prefabs-and-instantiation)
- [ScriptableObjects](#scriptableobjects)
- [Events and decoupling](#events-and-decoupling)
- [Performance basics](#performance-basics)
- [Build and platforms](#build-and-platforms)
- [Alternatives: Godot, MonoGame, Stride](#alternatives-godot-monogame-stride)
- [Common pitfalls](#common-pitfalls)

---

## Why Unity for C#

**[Certain]** Unity is the most widely used commercial game engine, especially for mobile, indie, and mid-budget titles. Its scripting language is C# (the engine itself is C++).

**[Likely]** If you want to learn game dev with your existing C# skills, Unity is the path of least resistance. The trade-off: you'll learn an engine-specific dialect of C# (lots of `MonoBehaviour`, attributes, lifecycle methods) that's different from typical app code.

**Other options summary (covered later):** Godot (C# supported but more niche), MonoGame (lower-level framework, not a full engine), Stride (open-source engine).

---

## Engine mental model

A Unity game is built from these primary concepts:

| Concept | What it is |
|---------|-----------|
| **Scene** | A container of GameObjects. One scene loaded at a time (or additively). |
| **GameObject** | An entity in the scene. Empty by itself — its behavior comes from attached components. |
| **Component** | Behavior attached to a GameObject. Built-in (`Transform`, `Rigidbody`, `Collider`) or custom (your scripts). |
| **Script** | A C# class inheriting `MonoBehaviour`, attached to a GameObject as a component. |
| **Prefab** | A reusable GameObject template stored as an asset. Drag into scene to instantiate. |
| **Asset** | Any file in `Assets/` — textures, models, scripts, audio, etc. |

**The composition-over-inheritance pattern is enforced.** You don't write `class Enemy : Character`. You attach a `Movement` component, a `Health` component, and an `EnemyAI` component to a GameObject called "Enemy".

---

## MonoBehaviour: the script lifecycle

```csharp
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    // Inspector-editable field (shown in editor)
    [SerializeField] private float speed = 5f;

    // Awake — first thing called, before Start, before any Start
    private void Awake()
    {
        // Use for initialization that doesn't depend on other objects
    }

    // Start — called once when object becomes active, after all Awakes
    private void Start()
    {
        // Use for setup that depends on other components/objects
    }

    // Update — called every frame
    private void Update()
    {
        // Per-frame logic (input, animations, non-physics movement)
    }

    // FixedUpdate — called at fixed timestep (50 times/sec by default)
    private void FixedUpdate()
    {
        // Physics-related code
    }

    // LateUpdate — after all Updates have run
    private void LateUpdate()
    {
        // Camera follow, post-movement adjustments
    }

    // OnEnable — every time the GameObject becomes active
    private void OnEnable() { }

    // OnDisable — when the GameObject becomes inactive
    private void OnDisable() { }

    // OnDestroy — when the GameObject is destroyed
    private void OnDestroy() { }
}
```

**The lifecycle pitfalls people hit first:**

- **`Awake` runs even on inactive GameObjects.** `Start` only runs once when the object first becomes active.
- **There's no constructor.** Unity instantiates `MonoBehaviour`s itself. Use `Awake` instead.
- **Don't reference other components in `Awake`** if you can't guarantee their `Awake` ran first. Use `Start` for cross-component setup.

---

## GameObjects and components

```csharp
public class Example : MonoBehaviour
{
    private Rigidbody _rb;

    private void Awake()
    {
        // Get a component on the same GameObject
        _rb = GetComponent<Rigidbody>();

        // Add a component at runtime
        gameObject.AddComponent<AudioSource>();

        // Find a component on a different GameObject
        var camera = GameObject.Find("Main Camera");  // by name (slow! use sparingly)
        var enemies = GameObject.FindGameObjectsWithTag("Enemy");

        // Get child / parent
        Transform child = transform.GetChild(0);
        Transform parent = transform.parent;

        // Get component in children/parent
        var weapon = GetComponentInChildren<Weapon>();
        var manager = GetComponentInParent<GameManager>();
    }
}
```

**`[SerializeField]` for inspector fields:**

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private float maxHealth = 100f;
    [SerializeField] private GameObject deathEffectPrefab;
    [SerializeField] private Transform shootPoint;

    // Public works too but is discouraged — encapsulation
    public float damage = 10f;
}
```

Set these values in the Unity Inspector at design time. Drag-and-drop references from other GameObjects/prefabs.

**`[SerializeField]` is preferred over `public`** because it exposes to the Inspector without breaking encapsulation.

---

## Transforms

Every GameObject has a `Transform` (or `RectTransform` for UI). Position, rotation, scale, and hierarchy live here.

```csharp
// Position
transform.position = new Vector3(0, 5, 0);             // world position
transform.localPosition = new Vector3(0, 5, 0);        // relative to parent

// Movement
transform.Translate(Vector3.forward * Time.deltaTime); // move forward

// Rotation
transform.rotation = Quaternion.Euler(0, 90, 0);       // 90° around Y axis
transform.Rotate(0, 90 * Time.deltaTime, 0);           // rotate over time

// LookAt
transform.LookAt(targetTransform);                     // face a target

// Scale
transform.localScale = new Vector3(2, 2, 2);           // double size
```

**Vector3 math:**

```csharp
Vector3.zero          // (0,0,0)
Vector3.one           // (1,1,1)
Vector3.up            // (0,1,0)
Vector3.forward       // (0,0,1)
Vector3.right         // (1,0,0)

Vector3 sum = a + b;
Vector3 scaled = a * 2f;
float dist = Vector3.Distance(a, b);
float dot = Vector3.Dot(a, b);
Vector3 cross = Vector3.Cross(a, b);
Vector3 dir = (target - source).normalized;
```

**Quaternions** represent rotations. Avoid Euler angles for math; use them for input/display.

```csharp
Quaternion lookRotation = Quaternion.LookRotation(direction);
Quaternion slerped = Quaternion.Slerp(current, target, t);
```

---

## Input

Unity has **two input systems**:

1. **Legacy Input Manager** (`Input.*`) — simple, works everywhere.
2. **New Input System** (package) — flexible, supports rebinding, multiple devices, action maps. Recommended for new projects.

**Legacy (still common in tutorials):**

```csharp
void Update()
{
    float h = Input.GetAxis("Horizontal");  // -1 to 1
    float v = Input.GetAxis("Vertical");

    if (Input.GetKeyDown(KeyCode.Space))    // first frame pressed
        Jump();

    if (Input.GetKey(KeyCode.LeftShift))    // held
        Sprint();

    if (Input.GetMouseButtonDown(0))        // left click
        Shoot();
}
```

**New Input System:**

```csharp
using UnityEngine.InputSystem;

public class Player : MonoBehaviour
{
    [SerializeField] private InputActionReference moveAction;

    private void OnEnable() => moveAction.action.Enable();
    private void OnDisable() => moveAction.action.Disable();

    private void Update()
    {
        Vector2 input = moveAction.action.ReadValue<Vector2>();
        transform.Translate(new Vector3(input.x, 0, input.y) * Time.deltaTime * 5f);
    }
}
```

**[Likely]** Start with the legacy system if you're learning. Switch to the new one when you need rebinding, controller support, or touch input.

---

## Time, FixedUpdate, and Update

**`Update`** runs once per rendered frame — variable rate (depends on FPS).
**`FixedUpdate`** runs at a fixed rate (50 Hz default) — for physics.

Multiply movement by `Time.deltaTime` so it's framerate-independent:

```csharp
private void Update()
{
    // Without deltaTime — moves faster at higher FPS (bug!)
    transform.position += Vector3.forward;

    // With deltaTime — 5 units per second regardless of framerate
    transform.position += Vector3.forward * 5f * Time.deltaTime;
}
```

**Time class:**

```csharp
Time.time             // seconds since game started
Time.deltaTime        // time since last Update
Time.fixedDeltaTime   // physics timestep (default 0.02)
Time.timeScale = 0.5f; // slow motion (0 = pause)
```

---

## Physics

**Rigidbody** + **Collider** = physics body.

```csharp
[RequireComponent(typeof(Rigidbody))]
public class Mover : MonoBehaviour
{
    private Rigidbody _rb;
    [SerializeField] private float jumpForce = 5f;
    [SerializeField] private float moveSpeed = 5f;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody>();
    }

    private void FixedUpdate()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        Vector3 move = new Vector3(h, 0, v) * moveSpeed;
        _rb.linearVelocity = new Vector3(move.x, _rb.linearVelocity.y, move.z);
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
            _rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
    }
}
```

**`[RequireComponent(typeof(X))]`** ensures the GameObject has component X. Unity adds it automatically if missing.

**Collision detection:**

```csharp
private void OnCollisionEnter(Collision collision)
{
    if (collision.gameObject.CompareTag("Enemy"))
        TakeDamage();
}

private void OnTriggerEnter(Collider other)
{
    // Triggers don't block — they just notify
    if (other.CompareTag("Pickup"))
        Collect(other.gameObject);
}
```

**Collision vs Trigger:**
- **Collision**: Physical contact. Object stops/bounces. Use for walls, ground, solids.
- **Trigger** (`IsTrigger` enabled on collider): No physics, but fires events. Use for pickups, zones, sensors.

**Raycast:**

```csharp
RaycastHit hit;
if (Physics.Raycast(transform.position, transform.forward, out hit, 100f))
{
    Debug.Log($"Hit {hit.collider.name} at {hit.point}");
}

// LayerMask filtering
int layerMask = LayerMask.GetMask("Enemy", "Wall");
if (Physics.Raycast(transform.position, transform.forward, out hit, 100f, layerMask))
{
    // ...
}
```

---

## Coroutines

Coroutines let you run logic across multiple frames without writing a state machine. They're not threads — they're cooperative scheduling on the main thread.

```csharp
public class Example : MonoBehaviour
{
    private void Start()
    {
        StartCoroutine(BlinkRoutine());
    }

    private IEnumerator BlinkRoutine()
    {
        for (int i = 0; i < 5; i++)
        {
            Renderer r = GetComponent<Renderer>();
            r.enabled = false;
            yield return new WaitForSeconds(0.2f);
            r.enabled = true;
            yield return new WaitForSeconds(0.2f);
        }
    }

    private IEnumerator FadeOut(float duration)
    {
        float t = 0;
        var mat = GetComponent<Renderer>().material;
        Color start = mat.color;

        while (t < duration)
        {
            t += Time.deltaTime;
            Color c = start;
            c.a = Mathf.Lerp(1, 0, t / duration);
            mat.color = c;
            yield return null;  // wait one frame
        }
    }
}
```

**Common yield instructions:**

```csharp
yield return null;                       // wait one frame
yield return new WaitForSeconds(2f);     // wait 2 seconds
yield return new WaitForFixedUpdate();   // wait until next FixedUpdate
yield return new WaitForEndOfFrame();    // wait until end of frame (for screen capture)
yield return new WaitUntil(() => isReady);  // wait for condition
yield return StartCoroutine(OtherRoutine());  // chain coroutines
```

**Stopping coroutines:**

```csharp
Coroutine handle = StartCoroutine(MyRoutine());
StopCoroutine(handle);
StopAllCoroutines();   // stop all on this MonoBehaviour
```

**Async/await alternative:** Unity supports `async`/`await`, but coroutines are still the idiomatic Unity pattern. UniTask (a library) provides better async integration. **[Likely]** Coroutines work fine for game-style flow; UniTask is worth it if you do a lot of async I/O.

---

## Prefabs and instantiation

A prefab is a reusable GameObject template. Spawn copies at runtime with `Instantiate`.

```csharp
public class Spawner : MonoBehaviour
{
    [SerializeField] private GameObject enemyPrefab;
    [SerializeField] private Transform spawnPoint;

    private void Start()
    {
        InvokeRepeating(nameof(SpawnEnemy), 1f, 2f);  // every 2s after 1s delay
    }

    private void SpawnEnemy()
    {
        GameObject enemy = Instantiate(enemyPrefab, spawnPoint.position, Quaternion.identity);
        // Optionally parent it
        enemy.transform.SetParent(transform);
    }
}
```

**Destroying objects:**

```csharp
Destroy(gameObject);           // destroy this GameObject
Destroy(gameObject, 5f);       // destroy after 5 seconds
Destroy(rb);                   // destroy specific component
```

**Object pooling** — better than `Instantiate`/`Destroy` for things that spawn/die often (bullets, particles, enemies). Unity 2021+ has built-in `ObjectPool<T>`:

```csharp
using UnityEngine.Pool;

public class BulletPool : MonoBehaviour
{
    [SerializeField] private Bullet bulletPrefab;
    private ObjectPool<Bullet> _pool;

    private void Awake()
    {
        _pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(bulletPrefab),
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            defaultCapacity: 20,
            maxSize: 100);
    }

    public Bullet GetBullet() => _pool.Get();
    public void ReturnBullet(Bullet b) => _pool.Release(b);
}
```

---

## ScriptableObjects

A `ScriptableObject` is a data container that lives as an asset, not on a GameObject. Use for configuration, item definitions, level data, anything shareable.

```csharp
[CreateAssetMenu(fileName = "NewWeapon", menuName = "Game/Weapon")]
public class WeaponData : ScriptableObject
{
    public string weaponName;
    public int damage;
    public float fireRate;
    public Sprite icon;
    public GameObject projectilePrefab;
}
```

In the editor: Right-click in Project → Create → Game → Weapon. This creates a `.asset` file you can edit in the Inspector and reference from scripts.

```csharp
public class Player : MonoBehaviour
{
    [SerializeField] private WeaponData currentWeapon;

    private void Shoot()
    {
        Debug.Log($"Firing {currentWeapon.weaponName} for {currentWeapon.damage} damage");
        Instantiate(currentWeapon.projectilePrefab, transform.position, transform.rotation);
    }
}
```

**Why ScriptableObjects:** Designers can create/edit data without writing code or recompiling. Better than hardcoding values in scripts or using JSON files.

---

## Events and decoupling

GameObjects shouldn't know about each other directly. Use events to decouple.

**C# events:**

```csharp
public class Health : MonoBehaviour
{
    public event Action<int> OnHealthChanged;
    public event Action OnDeath;

    private int _hp = 100;

    public void TakeDamage(int amount)
    {
        _hp -= amount;
        OnHealthChanged?.Invoke(_hp);
        if (_hp <= 0)
            OnDeath?.Invoke();
    }
}

public class HealthBar : MonoBehaviour
{
    [SerializeField] private Health playerHealth;
    [SerializeField] private Image fillImage;

    private void OnEnable() => playerHealth.OnHealthChanged += UpdateBar;
    private void OnDisable() => playerHealth.OnHealthChanged -= UpdateBar;

    private void UpdateBar(int hp)
    {
        fillImage.fillAmount = hp / 100f;
    }
}
```

**UnityEvent** (visible in Inspector, designer-friendly):

```csharp
using UnityEngine.Events;

public class Trigger : MonoBehaviour
{
    public UnityEvent onActivated;  // hook up actions in Inspector

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
            onActivated?.Invoke();
    }
}
```

In the Inspector, drag any GameObject and select a method to call — no code change required.

---

## Performance basics

**Most common perf issues in Unity:**

| Issue | Fix |
|-------|-----|
| `GameObject.Find` / `FindObjectOfType` in `Update` | Cache references in `Awake`/`Start` |
| Instantiating many objects per frame | Use object pooling |
| Garbage allocations every frame (LINQ, lambdas, new arrays) | Cache, reuse, avoid LINQ in hot paths |
| Heavy work in `Update` instead of `FixedUpdate` or coroutines | Spread across frames, use events instead of polling |
| Many small `Update` methods on inactive logic | Disable scripts you don't need active |
| Raycasting every frame | Cache, throttle, or use triggers |
| String concatenation in `Update` (e.g., debug UI) | Use `StringBuilder` or update only when value changes |
| Excessive `Transform` reads/writes | Cache `Transform` reference (`this.transform` is a property call) |
| Calling `GetComponent` every frame | Cache once in `Awake` |
| Using `tag == "Player"` instead of `CompareTag("Player")` | `CompareTag` avoids string allocation |

**Profile, don't guess.** The Unity Profiler (Window → Analysis → Profiler) shows exactly where time is spent and where GC happens.

---

## Build and platforms

Unity exports to many platforms from one codebase: Windows, macOS, Linux, iOS, Android, WebGL, consoles (with licenses).

**Player Settings** (Edit → Project Settings → Player) controls per-platform config (icons, splash, identifier, capabilities).

**Build:** File → Build Settings → choose platform → Build.

**Platform-specific code:**

```csharp
#if UNITY_EDITOR
    Debug.Log("Running in editor");
#elif UNITY_ANDROID
    Debug.Log("Running on Android");
#elif UNITY_IOS
    Debug.Log("Running on iOS");
#elif UNITY_WEBGL
    Debug.Log("Running in browser");
#endif
```

**Avoid `System.IO.File` paths that don't work cross-platform.** Use `Application.persistentDataPath` for save files:

```csharp
string savePath = Path.Combine(Application.persistentDataPath, "save.json");
File.WriteAllText(savePath, JsonUtility.ToJson(saveData));
```

---

## Alternatives: Godot, MonoGame, Stride

**Godot** — open-source, lightweight, supports C# (though GDScript is the primary language). Good for 2D especially. Smaller ecosystem than Unity but growing.

**MonoGame** — open-source framework (not engine). Successor to XNA. You write your own game loop, asset pipeline, etc. Used by Stardew Valley and Streets of Rage 4. Best when you want low-level control.

**Stride** — open-source C# engine with a Visual Studio-like editor. Powerful but small community.

**Unreal Engine** — uses C++ (and Blueprints visual scripting). Top-end AAA visual fidelity. Not a C# choice — included for completeness.

**[Likely]** Unity for almost any practical C# game dev path. Godot if you want open source and a smaller engine. MonoGame if you want full control and no editor.

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Movement in `Update` without `Time.deltaTime` | Multiply by `Time.deltaTime` for framerate-independence |
| Physics changes (`AddForce`, etc.) in `Update` | Move to `FixedUpdate` |
| `GameObject.Find` in `Update` | Cache in `Awake`/`Start`, or use events |
| Forgetting to unsubscribe from events in `OnDisable` | Always `+=` in `OnEnable`, `-=` in `OnDisable` |
| Calling `Destroy(obj)` then using `obj` immediately | `Destroy` is deferred; use `null` checks |
| Comparing `tag == "Player"` (allocates string) | `CompareTag("Player")` |
| LINQ in tight loops → garbage every frame | Manual loops in hot code |
| Public fields everywhere instead of `[SerializeField] private` | Keep API surface tight |
| Massive God-MonoBehaviour with 500 lines | Split into single-responsibility components |
| Coroutine that does `while(true) yield return null;` with no exit | Always have a stop condition |
| Not using object pooling for bullets/particles | Pool everything that respawns frequently |
| Storing data in scenes instead of ScriptableObjects | ScriptableObjects survive scene loads, easier to test |
| Hardcoded paths like `Resources.Load("textures/foo")` everywhere | Use direct references via `[SerializeField]` or Addressables for dynamic loading |
| Updating UI text every frame | Update only when value changes |
| Forgetting platform differences in input (mouse vs touch) | Test on target device; use new Input System or `Input.touchCount` checks |

---

→ Next: [14 — .NET runtime and performance](14_dotnet_runtime_and_performance.md)
