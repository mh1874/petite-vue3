// 实现 new Proxy(target, baseHandlers) 的 baseHandlers
// 是不是仅读的，仅读的属性set时会报异常
// 是不是深度的

import { extend, isObject } from '@vue/shared';
import { reactive, readonly } from './reactive';

const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const set = createSetter();
const shallowSet = true;

export const mutableHandlers = {
  get,
};
export const shallowReactiveHandlers = {
  get: shallowGet,
};

let readonlyObj = {
  set: (target, key) => {
    console.warn(`set key ${key} failed`);
  },
};

export const readonlyHandlers = extend(
  {
    get: readonlyGet,
  },
  readonlyObj
);

export const shallowReadonlyHandlers = extend(
  {
    get: shallowReadonlyGet,
  },
  readonlyObj
);

function createGetter(isReadonly = false, shallow = false) {
  // 拦截获取功能
  return function get(target, key, receiver) {
    // let proxy = reactive()
    // proxy + reflect 反射
    // 后续Object上的方法会被迁移到Reflect上， Object.getPrototypeOf => Reflect.getPrototypeOf
    // 以前target[key] = value 方式设置值可能会失败，比如原型上有这个属性，但是设置不成功。并不会报异常，也没有返回值标识
    // Reflect 方法具备返回值，返回值标识是否设置成功
    // reflect 使用可以不使用proxy 但是proxy必须配合reflect一起使用
    const res = Reflect.get(target, key, receiver); // target[key]
    if (!isReadonly) {
      // 可能被改，收集依赖，等会数据变化后更新对应的视图
    }
    if (shallow) {
      return res;
    }
    // 是对象 有可能要递归
    if (isObject(res)) {
      // vue2 是一上来就递归，vue3 是当取值的时候才会代理，vue3的代理模式是懒代理
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}

function createSetter(shallow = false) {
  // 拦截获取功能
  return function set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver); // target[key] = value
  };
} // 拦截设置功能
