export const SortableAttributes = [
  'delay',
  'group',
  'handle',
  'disabled',
  'draggable',
  'animation',
  'autoScroll',
  'ghostClass',
  'ghostStyle',
  'chosenClass',
  'fallbackOnBody',
  'scrollThreshold',
  'delayOnTouchOnly',
];

export const CACLTYPE = {
  INIT: 'INIT',
  FIXED: 'FIXED',
  DYNAMIC: 'DYNAMIC',
};

export const SCROLL_DIRECTION = {
  FRONT: 'FRONT',
  BEHIND: 'BEHIND',
  STATIONARY: 'STATIONARY',
};

export const DIRECTION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

export const scrollType = {
  [DIRECTION.VERTICAL]: 'scrollTop',
  [DIRECTION.HORIZONTAL]: 'scrollLeft',
};

export const scrollSize = {
  [DIRECTION.VERTICAL]: 'scrollHeight',
  [DIRECTION.HORIZONTAL]: 'scrollWidth',
};

export const offsetSize = {
  [DIRECTION.VERTICAL]: 'offsetHeight',
  [DIRECTION.HORIZONTAL]: 'offsetWidth',
};

export const offsetType = {
  [DIRECTION.VERTICAL]: 'offsetTop',
  [DIRECTION.HORIZONTAL]: 'offsetLeft',
};
