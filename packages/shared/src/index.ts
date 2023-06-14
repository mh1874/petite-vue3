export const isObject = (value) => value !== null && typeof value === 'object';
export const extend = Object.assign;
export const isArray = Array.isArray;
export const isFunction = (val) => typeof val === 'function';
export const isNumber = (val) => typeof val === 'number';
export const isString = (val) => typeof val === 'string';
// 判断是不是一个数字类型的key
export const isIntegerKey = (key) => parseInt(key) + '' === key;
export const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target, key);
export const hasChanged = (value, oldValue) => value !== oldValue;
