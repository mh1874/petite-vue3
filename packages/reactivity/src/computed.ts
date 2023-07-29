import { isFunction } from '@vue/shared';
import { effect, track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';

class ComputedRefImpl {
  public _dirty = true; // 默认取值时，不要用缓存
  public _value;
  public effect;
  constructor(getter, public setter) {
    // ts中默认不会挂载到this上，可以加public
    this.effect = effect(getter, {
      // 计算属性默认会产生一个effect
      lazy: true, // 默认不执行
      scheduler: () => {
        // 依赖变化后执行
        if (!this._dirty) {
          this._dirty = true; // 设置为true，重新执行effect
          // 依赖的属性变化，通知对应的effect重新执行
          trigger(this, TriggerOpTypes.SET, 'value');
        }
      },
    });
  }
  get value() {
    // 计算属性也要收集依赖 vue2中不具备收集依赖的功能
    if (this._dirty) {
      this._value = this.effect(); // 会将用户的返回值返回
      this._dirty = false;
    }
    // 当访问了this的value属性时，就做一个依赖收集
    track(this, TrackOpTypes.GET, 'value');
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
}

// vue2 和 vue3 computed原理是不一样的
// vue2 是一个watcher，vue3是一个特殊的effect
export function computed(getterOrOptions) {
  // 如果是函数，就是一个getter
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {
      console.warn('computed value must be readonly');
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

/**
 * 注：example中age是父级 myAge计算属性是儿子
 * 1. 让自己的儿子把自己收集起来，所以他自己是个effect line11
 * 2. 取值的过程中让他父级也能收集他自己，所以取值的时候也要收集依赖 line29
 * 3. 当他儿子更新了，除了修改自己的dirty属性，还要通知父级收集的依赖也要更新 line18
 */
