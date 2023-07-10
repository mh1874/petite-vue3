import { hasChanged, isArray, isObject } from '@vue/shared';
import { track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';
import { reactive } from './reactive';

/**
 * ref和reactive的区别
 * reactive内部采用的是proxy，而ref内部使用的是defineProperty
 * reactive处理不了基本类型，ref可以处理基本类型
 */
export function ref(value) {
  // value是一个普通类型，也可以是对象，但是一般情况下是对象直接用reactive更合理
  // 将普通类型变成一个对象
  return createRef(value);
}

export function shallowRef(value) {
  return createRef(value, true);
}

// 后续 看vue的源码，基本都是高阶函数，做了类似柯里化的操作

const convert = (val) => (isObject(val) ? reactive(val) : val);
// beta 版本之前的版本ref就是个对象，因为对象不方便扩展，改成了类

// RefImpl经babel转义后是Object.defineProperty 可通过 https://babeljs.io/repl 查看
// 基本类型为什么不用proxy, 而是用defineProperty, 因为proxy第一个参数要求是对象
class RefImpl {
  public _value; // 表示 声明了一个_value属性，但是没有赋值
  public __v_isRef = true; // 产生的实例会被添加__v_isRef 表示是一个ref属性
  constructor(public rawValue, public shallow) {
    //参数中前面增加修饰符 表示此属性放到了实例上, 不加public，就不会放到this上
    this._value = shallow ? rawValue : convert(rawValue); // 如果是深度的，需要把里面的都变成响应式的
  }
  // 类的属性访问器
  get value() {
    // 代理 取值取value，会帮我们代理到_value上
    // 取值 track 依赖收集
    track(this, TrackOpTypes.GET, 'value');
    return this._value;
  }
  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      // 判断老值和新值是否有变化
      this.rawValue = newValue; // 更新老值
      this._value = this.shallow ? newValue : convert(newValue); // 更新_value
    }
    // 设置值 trigger 触发依赖更新 让effect重新执行
    trigger(this, TriggerOpTypes.SET, 'value', newValue);
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow);
}

class ObjectRefImpl {
  public __v_isRef = true;
  constructor(public target, public key) {}
  get value() {
    return this.target[this.key]; // 如果原来对象是响应式的，会自动收集依赖
  }
  set value(newValue) {
    this.target[this.key] = newValue; // 如果原来对象是响应式的，会自动更新
  }
}

// 类似promisify和promisifyAll

// 将某一个key的对应的值 转换成ref 相当于vue3中的响应式解构
export function toRef(target, key) {
  // 可以把一个对象的值转换成ref类型
  return new ObjectRefImpl(target, key);
}

export function toRefs(object) {
  // object可能是数组或者对象
  const ret = isArray(object) ? new Array(object.length) : {};
  for (let key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
