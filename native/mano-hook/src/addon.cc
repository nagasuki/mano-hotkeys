// Low-level Windows keyboard + mouse hook with native-side suppression.
//
// Architecture:
//   - One worker thread owns both WH_KEYBOARD_LL and WH_MOUSE_LL and runs a
//     single Win32 message pump. SetWindowsHookEx requires a thread that
//     pumps messages; the callbacks must return promptly (Windows enforces
//     LowLevelHooksTimeout, default ~300ms).
//   - Each callback decides synchronously whether to swallow an event using
//     a ruleset cached in shared state (mutex-guarded). Decisions are
//     O(rules) over a small list.
//   - Events are dispatched to JS asynchronously via threadsafe-function;
//     JS never blocks the hook.
//   - SendInput-generated events are tagged with a magic dwExtraInfo so the
//     hook ignores its own synthetic input (no feedback loops).
//   - Mouse "pseudo-VKs" (>= 0x200) let the JS side reuse the same key
//     namespace for mouse buttons and wheel ticks.

#include <windows.h>
#include <napi.h>
#include <atomic>
#include <mutex>
#include <thread>
#include <vector>
#include <string>
#include <optional>

// windows.h defines MOD_CTRL / MOD_ALT / MOD_SHIFT / MOD_WIN as
// RegisterHotKey modifier flags. We use the same names with different
// values, so undef before redefining.
#ifdef MOD_CTRL
#  undef MOD_CTRL
#endif
#ifdef MOD_ALT
#  undef MOD_ALT
#endif
#ifdef MOD_SHIFT
#  undef MOD_SHIFT
#endif
#ifdef MOD_WIN
#  undef MOD_WIN
#endif

namespace {

constexpr ULONG_PTR MANO_EXTRA_INFO = 0xCA11BACCULL;

constexpr uint32_t MOD_CTRL  = 1u << 0;
constexpr uint32_t MOD_ALT   = 1u << 1;
constexpr uint32_t MOD_SHIFT = 1u << 2;
constexpr uint32_t MOD_WIN   = 1u << 3;

// Mouse pseudo-VKs (outside the 8-bit Windows VK space).
constexpr uint16_t MVK_BASE       = 0x200;
constexpr uint16_t MVK_LEFT       = 0x201;
constexpr uint16_t MVK_RIGHT      = 0x202;
constexpr uint16_t MVK_MIDDLE     = 0x203;
constexpr uint16_t MVK_X1         = 0x204;
constexpr uint16_t MVK_X2         = 0x205;
constexpr uint16_t MVK_WHEEL_UP   = 0x210;
constexpr uint16_t MVK_WHEEL_DOWN = 0x211;
constexpr uint16_t MVK_WHEEL_LEFT = 0x212;
constexpr uint16_t MVK_WHEEL_RIGHT= 0x213;

constexpr bool IsMousePseudoVk(uint16_t vk) { return vk >= MVK_BASE; }

enum class RuleKind : uint8_t { Hotkey, Remap };

struct Rule {
  std::string id;
  uint16_t vk;
  uint32_t mods;     // required mask (exact match)
  RuleKind kind;
};

struct Ruleset {
  std::vector<Rule> kbRules;
  std::vector<Rule> mouseRules;
  bool suspended = false;
};

std::mutex g_mutex;
Ruleset g_ruleset;

std::atomic<bool> g_running{false};
std::atomic<HHOOK> g_kb_hook{nullptr};
std::atomic<HHOOK> g_mouse_hook{nullptr};
std::atomic<DWORD> g_thread_id{0};
std::thread g_thread;

Napi::ThreadSafeFunction g_tsfn;

enum class EvKind : uint8_t { Key, MouseButton, MouseWheel };

struct EventOut {
  EvKind kind;
  uint16_t vk;       // VK for keys; MVK_* for mouse buttons/wheel
  uint32_t mods;
  bool up;           // for keys + mouse buttons; ignored for wheel
  bool suppressed;
  int32_t x;         // mouse only
  int32_t y;         // mouse only
  int32_t wheelDelta;// signed delta (raw, +/-120 per notch typically)
  std::string ruleId;
};

uint32_t ReadModifierMask() {
  uint32_t m = 0;
  if (GetAsyncKeyState(VK_CONTROL) & 0x8000) m |= MOD_CTRL;
  if (GetAsyncKeyState(VK_MENU)    & 0x8000) m |= MOD_ALT;
  if (GetAsyncKeyState(VK_SHIFT)   & 0x8000) m |= MOD_SHIFT;
  if ((GetAsyncKeyState(VK_LWIN) | GetAsyncKeyState(VK_RWIN)) & 0x8000) m |= MOD_WIN;
  return m;
}

bool IsModifierVk(DWORD vk) {
  switch (vk) {
    case VK_LCONTROL: case VK_RCONTROL: case VK_CONTROL:
    case VK_LMENU:    case VK_RMENU:    case VK_MENU:
    case VK_LSHIFT:   case VK_RSHIFT:   case VK_SHIFT:
    case VK_LWIN:     case VK_RWIN:
      return true;
    default:
      return false;
  }
}

std::optional<Rule> FindKbRule(uint16_t vk, uint32_t mods, bool& suspended) {
  std::lock_guard<std::mutex> lk(g_mutex);
  suspended = g_ruleset.suspended;
  if (suspended) return std::nullopt;
  for (const auto& r : g_ruleset.kbRules) {
    if (r.vk == vk && r.mods == mods) return r;
  }
  return std::nullopt;
}

std::optional<Rule> FindMouseRule(uint16_t mvk, uint32_t mods, bool& suspended) {
  std::lock_guard<std::mutex> lk(g_mutex);
  suspended = g_ruleset.suspended;
  if (suspended) return std::nullopt;
  for (const auto& r : g_ruleset.mouseRules) {
    if (r.vk == mvk && r.mods == mods) return r;
  }
  return std::nullopt;
}

void DispatchEvent(EventOut* ev) {
  napi_status st = g_tsfn.NonBlockingCall(ev, [](Napi::Env env, Napi::Function jsCb, EventOut* e) {
    Napi::Object o = Napi::Object::New(env);
    const char* kindStr =
        (e->kind == EvKind::Key)         ? "key" :
        (e->kind == EvKind::MouseButton) ? "mouseButton" : "wheel";
    o.Set("kind", Napi::String::New(env, kindStr));
    o.Set("vk", Napi::Number::New(env, e->vk));
    o.Set("mods", Napi::Number::New(env, e->mods));
    o.Set("up", Napi::Boolean::New(env, e->up));
    o.Set("suppressed", Napi::Boolean::New(env, e->suppressed));
    if (e->kind != EvKind::Key) {
      o.Set("x", Napi::Number::New(env, e->x));
      o.Set("y", Napi::Number::New(env, e->y));
    }
    if (e->kind == EvKind::MouseWheel) {
      o.Set("wheelDelta", Napi::Number::New(env, e->wheelDelta));
    }
    if (!e->ruleId.empty()) o.Set("ruleId", Napi::String::New(env, e->ruleId));
    delete e;
    jsCb.Call({ o });
  });
  if (st != napi_ok) delete ev;
}

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode != HC_ACTION) return CallNextHookEx(nullptr, nCode, wParam, lParam);
  auto* info = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
  if (info->dwExtraInfo == MANO_EXTRA_INFO) {
    return CallNextHookEx(nullptr, nCode, wParam, lParam);
  }
  const bool up = (wParam == WM_KEYUP || wParam == WM_SYSKEYUP);
  const uint16_t vk = static_cast<uint16_t>(info->vkCode);
  const uint32_t mods = ReadModifierMask();

  bool suppress = false;
  std::string ruleId;
  if (!up && !IsModifierVk(vk)) {
    bool suspended = false;
    auto match = FindKbRule(vk, mods, suspended);
    if (match.has_value()) {
      suppress = true;
      ruleId = match->id;
    }
  }

  auto* ev = new EventOut{};
  ev->kind = EvKind::Key;
  ev->vk = vk;
  ev->mods = mods;
  ev->up = up;
  ev->suppressed = suppress;
  ev->ruleId = std::move(ruleId);
  DispatchEvent(ev);

  return suppress ? 1 : CallNextHookEx(nullptr, nCode, wParam, lParam);
}

LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode != HC_ACTION) return CallNextHookEx(nullptr, nCode, wParam, lParam);
  auto* info = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);
  if (info->dwExtraInfo == MANO_EXTRA_INFO) {
    return CallNextHookEx(nullptr, nCode, wParam, lParam);
  }

  const uint32_t mods = ReadModifierMask();
  bool suppress = false;
  std::string ruleId;
  std::optional<EventOut> out;

  auto makeButton = [&](uint16_t mvk, bool isUp) {
    EventOut e{};
    e.kind = EvKind::MouseButton;
    e.vk = mvk;
    e.mods = mods;
    e.up = isUp;
    e.x = info->pt.x;
    e.y = info->pt.y;
    return e;
  };
  auto makeWheel = [&](uint16_t mvk, int32_t delta) {
    EventOut e{};
    e.kind = EvKind::MouseWheel;
    e.vk = mvk;
    e.mods = mods;
    e.up = false;
    e.x = info->pt.x;
    e.y = info->pt.y;
    e.wheelDelta = delta;
    return e;
  };

  switch (wParam) {
    case WM_LBUTTONDOWN: out = makeButton(MVK_LEFT, false); break;
    case WM_LBUTTONUP:   out = makeButton(MVK_LEFT, true);  break;
    case WM_RBUTTONDOWN: out = makeButton(MVK_RIGHT, false); break;
    case WM_RBUTTONUP:   out = makeButton(MVK_RIGHT, true);  break;
    case WM_MBUTTONDOWN: out = makeButton(MVK_MIDDLE, false); break;
    case WM_MBUTTONUP:   out = makeButton(MVK_MIDDLE, true);  break;
    case WM_XBUTTONDOWN:
    case WM_XBUTTONUP: {
      WORD xb = GET_XBUTTON_WPARAM(info->mouseData);
      uint16_t mvk = (xb == XBUTTON1) ? MVK_X1 : MVK_X2;
      out = makeButton(mvk, wParam == WM_XBUTTONUP);
      break;
    }
    case WM_MOUSEWHEEL: {
      SHORT delta = GET_WHEEL_DELTA_WPARAM(info->mouseData);
      out = makeWheel(delta > 0 ? MVK_WHEEL_UP : MVK_WHEEL_DOWN, delta);
      break;
    }
    case WM_MOUSEHWHEEL: {
      SHORT delta = GET_WHEEL_DELTA_WPARAM(info->mouseData);
      out = makeWheel(delta > 0 ? MVK_WHEEL_RIGHT : MVK_WHEEL_LEFT, delta);
      break;
    }
    default:
      // WM_MOUSEMOVE etc: don't dispatch (high volume, no rules can match).
      return CallNextHookEx(nullptr, nCode, wParam, lParam);
  }

  // Suppression: only consider down/wheel events. Up events follow the
  // suppressed-down so the focused app doesn't see a phantom release.
  const bool isDown = out->kind == EvKind::MouseWheel ? true : !out->up;
  if (isDown) {
    bool suspended = false;
    auto match = FindMouseRule(out->vk, out->mods, suspended);
    if (match.has_value()) {
      suppress = true;
      ruleId = match->id;
    }
  }
  out->suppressed = suppress;
  out->ruleId = std::move(ruleId);
  auto* ev = new EventOut(*out);
  DispatchEvent(ev);

  return suppress ? 1 : CallNextHookEx(nullptr, nCode, wParam, lParam);
}

void HookThreadMain() {
  g_thread_id.store(GetCurrentThreadId());
  HMODULE mod = GetModuleHandleW(nullptr);
  HHOOK kb = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, mod, 0);
  HHOOK ms = SetWindowsHookExW(WH_MOUSE_LL,    LowLevelMouseProc,    mod, 0);
  g_kb_hook.store(kb);
  g_mouse_hook.store(ms);
  if (!kb || !ms) {
    if (kb) UnhookWindowsHookEx(kb);
    if (ms) UnhookWindowsHookEx(ms);
    g_kb_hook.store(nullptr);
    g_mouse_hook.store(nullptr);
    g_running.store(false);
    return;
  }

  MSG msg;
  while (g_running.load()) {
    BOOL r = GetMessageW(&msg, nullptr, 0, 0);
    if (r == 0 || r == -1) break;
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }

  UnhookWindowsHookEx(kb);
  UnhookWindowsHookEx(ms);
  g_kb_hook.store(nullptr);
  g_mouse_hook.store(nullptr);
  g_thread_id.store(0);
}

// ----- N-API bindings -----

Napi::Value Start(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (g_running.load()) return env.Undefined();
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "start(cb) requires a callback").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  g_tsfn = Napi::ThreadSafeFunction::New(
      env, info[0].As<Napi::Function>(), "mano-hook-events", 0, 1);
  g_running.store(true);
  g_thread = std::thread(HookThreadMain);
  return env.Undefined();
}

Napi::Value Stop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_running.load()) return env.Undefined();
  g_running.store(false);
  DWORD tid = g_thread_id.load();
  if (tid) PostThreadMessageW(tid, WM_QUIT, 0, 0);
  if (g_thread.joinable()) g_thread.join();
  if (g_tsfn) {
    g_tsfn.Release();
    g_tsfn = Napi::ThreadSafeFunction();
  }
  return env.Undefined();
}

Napi::Value IsRunning(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), g_running.load());
}

Napi::Value SetRuleset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "setRuleset(obj) requires an object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Object obj = info[0].As<Napi::Object>();
  Ruleset rs;
  if (obj.Has("suspended")) rs.suspended = obj.Get("suspended").ToBoolean();

  if (obj.Has("entries")) {
    Napi::Array entries = obj.Get("entries").As<Napi::Array>();
    for (uint32_t i = 0; i < entries.Length(); i++) {
      Napi::Object e = entries.Get(i).As<Napi::Object>();
      Rule r;
      r.id   = e.Get("id").ToString().Utf8Value();
      r.vk   = static_cast<uint16_t>(e.Get("vk").ToNumber().Uint32Value());
      r.mods = e.Get("mods").ToNumber().Uint32Value();
      std::string kind = e.Get("kind").ToString().Utf8Value();
      r.kind = (kind == "remap") ? RuleKind::Remap : RuleKind::Hotkey;
      if (IsMousePseudoVk(r.vk)) rs.mouseRules.push_back(std::move(r));
      else                        rs.kbRules.push_back(std::move(r));
    }
  }

  {
    std::lock_guard<std::mutex> lk(g_mutex);
    g_ruleset = std::move(rs);
  }
  return env.Undefined();
}

Napi::Value SendInputJs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "sendInput(steps) requires an array").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Array steps = info[0].As<Napi::Array>();
  const uint32_t n = steps.Length();
  if (n == 0) return env.Undefined();
  std::vector<INPUT> buf(n);
  for (uint32_t i = 0; i < n; i++) {
    Napi::Object s = steps.Get(i).As<Napi::Object>();
    WORD vk = static_cast<WORD>(s.Get("vk").ToNumber().Uint32Value());
    bool down = s.Get("down").ToBoolean();
    INPUT& in = buf[i];
    ZeroMemory(&in, sizeof(in));
    in.type = INPUT_KEYBOARD;
    in.ki.wVk = vk;
    in.ki.dwFlags = down ? 0 : KEYEVENTF_KEYUP;
    switch (vk) {
      case VK_RMENU: case VK_RCONTROL:
      case VK_INSERT: case VK_DELETE: case VK_HOME: case VK_END:
      case VK_PRIOR: case VK_NEXT:
      case VK_LEFT: case VK_UP: case VK_RIGHT: case VK_DOWN:
      case VK_NUMLOCK: case VK_DIVIDE: case VK_LWIN: case VK_RWIN:
        in.ki.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        break;
      default: break;
    }
    in.ki.dwExtraInfo = MANO_EXTRA_INFO;
  }
  SendInput(static_cast<UINT>(n), buf.data(), sizeof(INPUT));
  return env.Undefined();
}

Napi::Value Tap(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "tap(vk) requires a number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  WORD vk = static_cast<WORD>(info[0].As<Napi::Number>().Uint32Value());
  INPUT in[2] = {};
  in[0].type = INPUT_KEYBOARD;
  in[0].ki.wVk = vk;
  in[0].ki.dwExtraInfo = MANO_EXTRA_INFO;
  in[1].type = INPUT_KEYBOARD;
  in[1].ki.wVk = vk;
  in[1].ki.dwFlags = KEYEVENTF_KEYUP;
  in[1].ki.dwExtraInfo = MANO_EXTRA_INFO;
  SendInput(2, in, sizeof(INPUT));
  return env.Undefined();
}

Napi::Value IsKeyDown(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "isKeyDown(vk) requires a number").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
  int vk = info[0].As<Napi::Number>().Int32Value();
  return Napi::Boolean::New(env, (GetAsyncKeyState(vk) & 0x8000) != 0);
}

// Translate a mouse pseudo-VK to the SendInput mouseData/dwFlags pair.
struct MouseStep {
  DWORD dwFlags;
  DWORD mouseData;
};

bool MouseStepForButton(uint16_t mvk, bool down, MouseStep& out) {
  out = {};
  switch (mvk) {
    case MVK_LEFT:    out.dwFlags = down ? MOUSEEVENTF_LEFTDOWN   : MOUSEEVENTF_LEFTUP;   return true;
    case MVK_RIGHT:   out.dwFlags = down ? MOUSEEVENTF_RIGHTDOWN  : MOUSEEVENTF_RIGHTUP;  return true;
    case MVK_MIDDLE:  out.dwFlags = down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP; return true;
    case MVK_X1:      out.dwFlags = down ? MOUSEEVENTF_XDOWN      : MOUSEEVENTF_XUP;
                      out.mouseData = XBUTTON1; return true;
    case MVK_X2:      out.dwFlags = down ? MOUSEEVENTF_XDOWN      : MOUSEEVENTF_XUP;
                      out.mouseData = XBUTTON2; return true;
    case MVK_WHEEL_UP:    out.dwFlags = MOUSEEVENTF_WHEEL;  out.mouseData = WHEEL_DELTA;  return true;
    case MVK_WHEEL_DOWN:  out.dwFlags = MOUSEEVENTF_WHEEL;  out.mouseData = (DWORD)(-WHEEL_DELTA); return true;
    case MVK_WHEEL_LEFT:  out.dwFlags = MOUSEEVENTF_HWHEEL; out.mouseData = (DWORD)(-WHEEL_DELTA); return true;
    case MVK_WHEEL_RIGHT: out.dwFlags = MOUSEEVENTF_HWHEEL; out.mouseData = WHEEL_DELTA;  return true;
    default: return false;
  }
}

Napi::Value SendMouseInputJs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "sendMouseInput(steps) requires an array").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Array steps = info[0].As<Napi::Array>();
  const uint32_t n = steps.Length();
  if (n == 0) return env.Undefined();
  std::vector<INPUT> buf;
  buf.reserve(n);
  for (uint32_t i = 0; i < n; i++) {
    Napi::Object s = steps.Get(i).As<Napi::Object>();
    std::string kind = s.Get("kind").ToString().Utf8Value();
    INPUT in{};
    in.type = INPUT_MOUSE;
    in.mi.dwExtraInfo = MANO_EXTRA_INFO;
    if (kind == "button" || kind == "wheel") {
      uint16_t mvk = static_cast<uint16_t>(s.Get("vk").ToNumber().Uint32Value());
      bool down = s.Has("down") ? s.Get("down").ToBoolean().Value() : true;
      MouseStep step;
      if (!MouseStepForButton(mvk, down, step)) continue;
      in.mi.dwFlags = step.dwFlags;
      in.mi.mouseData = step.mouseData;
    } else if (kind == "move") {
      int32_t x = s.Get("x").ToNumber().Int32Value();
      int32_t y = s.Get("y").ToNumber().Int32Value();
      bool absolute = s.Has("absolute") ? s.Get("absolute").ToBoolean().Value() : false;
      in.mi.dx = x;
      in.mi.dy = y;
      in.mi.dwFlags = MOUSEEVENTF_MOVE | (absolute ? MOUSEEVENTF_ABSOLUTE : 0);
    } else {
      continue;
    }
    buf.push_back(in);
  }
  if (!buf.empty()) SendInput(static_cast<UINT>(buf.size()), buf.data(), sizeof(INPUT));
  return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("start",          Napi::Function::New(env, Start));
  exports.Set("stop",           Napi::Function::New(env, Stop));
  exports.Set("isRunning",      Napi::Function::New(env, IsRunning));
  exports.Set("setRuleset",     Napi::Function::New(env, SetRuleset));
  exports.Set("sendInput",      Napi::Function::New(env, SendInputJs));
  exports.Set("sendMouseInput", Napi::Function::New(env, SendMouseInputJs));
  exports.Set("tap",            Napi::Function::New(env, Tap));
  exports.Set("isKeyDown",      Napi::Function::New(env, IsKeyDown));
  exports.Set("MOD_CTRL",   Napi::Number::New(env, MOD_CTRL));
  exports.Set("MOD_ALT",    Napi::Number::New(env, MOD_ALT));
  exports.Set("MOD_SHIFT",  Napi::Number::New(env, MOD_SHIFT));
  exports.Set("MOD_WIN",    Napi::Number::New(env, MOD_WIN));
  // Mouse pseudo-VKs
  exports.Set("MVK_LEFT",       Napi::Number::New(env, MVK_LEFT));
  exports.Set("MVK_RIGHT",      Napi::Number::New(env, MVK_RIGHT));
  exports.Set("MVK_MIDDLE",     Napi::Number::New(env, MVK_MIDDLE));
  exports.Set("MVK_X1",         Napi::Number::New(env, MVK_X1));
  exports.Set("MVK_X2",         Napi::Number::New(env, MVK_X2));
  exports.Set("MVK_WHEEL_UP",   Napi::Number::New(env, MVK_WHEEL_UP));
  exports.Set("MVK_WHEEL_DOWN", Napi::Number::New(env, MVK_WHEEL_DOWN));
  exports.Set("MVK_WHEEL_LEFT", Napi::Number::New(env, MVK_WHEEL_LEFT));
  exports.Set("MVK_WHEEL_RIGHT",Napi::Number::New(env, MVK_WHEEL_RIGHT));
  return exports;
}

} // namespace

NODE_API_MODULE(mano_hook, Init)
