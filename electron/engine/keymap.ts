// Compat shim. Original module wrapped uiohook-napi keycodes; we now use
// Windows VK codes from ./vk.ts. Re-export the new surface under the old
// names so existing call sites keep working without churn.

export {
  KEY_TO_VK as KEY_TO_CODE,
  VK_TO_KEY as CODE_TO_KEY,
  MODIFIERS,
  sortModifiers,
  printableChar,
  isModifierVk as isModifierCode,
  isMousePseudoVk,
  modMaskFromList,
  MOD_CTRL,
  MOD_ALT,
  MOD_SHIFT,
  MOD_WIN,
  MVK_LEFT,
  MVK_RIGHT,
  MVK_MIDDLE,
  MVK_X1,
  MVK_X2,
  MVK_WHEEL_UP,
  MVK_WHEEL_DOWN,
  MVK_WHEEL_LEFT,
  MVK_WHEEL_RIGHT,
  type Modifier
} from './vk.js'
