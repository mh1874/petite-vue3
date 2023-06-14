// 实现 new Proxy(target, baseHandlers) 的 baseHandlers
// 是不是仅读的，仅读的属性set时会报异常
// 是不是深度的

import {
  extend,
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
} from '@vue/shared';
import { reactive, readonly } from './reactive';
import { track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';

const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const set = createSetter();
const shallowSet = true;

export const mutableHandlers = {
  get,
  set,
};
export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet,
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
      // console.log('执行ef fect时会取值', '收集effect');
      track(target, TrackOpTypes.GET, key);
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
  return function set(target, key, value, receiver) {
    const oldValue = target[key]; // 获取老的值
    // 既是数组，修改的也是他的索引 如果索引比数组的长度大，相当于新增
    let hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver); // target[key] = value
    // 1. 要区分是新增还是修改 vue2里无法监控更改索引，无法监控数组的长度
    // 变化 => hack的方法，需要特殊处理
    if (!hadKey) {
      // 新增
      trigger(target, TriggerOpTypes.ADD, key, value);
    } else if (hasChanged(oldValue, value)) {
      // 修改
      trigger(target, TriggerOpTypes.SET, key, value, oldValue);
    }

    // 当数据更新时，通知对应属性的effect重新执行

    return result;
  };
} // 拦截设置功能
