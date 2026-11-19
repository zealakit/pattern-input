export type {
  Affinity,
  BaseFieldEvent,
  FieldStatus,
  KeyInput,
  SelectionDirection,
  StickyAnchor,
  StickySelection,
} from "./types.js";
export type {
  EditableMap,
  EditableUnit,
  IndexBias,
} from "./editable-map.js";
export {
  anchorToIndex,
  indexToAnchor,
  selectionFromIndices,
  selectionToIndices,
} from "./editable-map.js";
export type { EditRange, NormalizedSelection } from "./sticky.js";
export {
  caret,
  isCollapsed,
  moveCaret,
  normalize,
  remapAfterEdit,
  selectedRange,
} from "./sticky.js";
export type { KeyPlatform } from "./keys.js";
export { isComposing, isModified, isWordDelete } from "./keys.js";
