class MyPromise {
  constructor(fn) {
    if (typeof fn !== 'function') {
      throw new Error('参数必须为函数');
    }
    this._state = 'Pending';
    this._value = null;
    this._reason = null;
    this.fulfillCallbacks = [];
    this.rejectCallbacks = [];

    fn(this._resolve.bind(this), this._reject.bind(this));
  }

  // 将promise转化为Fulfilled状态，并依次执行then注册的onFulfilled回调函数
  _resolve(value) {
    if (this._state !== 'Pending') return;

    let run = () => {

      let runFulfill = (val) => {
        this._state = 'Fulfilled';
        this._value = val;

        let cb;
        while(cb = this.fulfillCallbacks.shift()) {
          cb(value);
        }
      }

      let runReject = (err) => {
        this._state = 'Rejected';
        this._reason = err;

        let cb;
        while(cb = this.rejectCallbacks.shift()) {
          cb(err);
        }
      }

      if (value instanceof MyPromise) {
        value.then(runFulfill, runReject);
      } else {
        runFulfill(value);
      }
    }

    process.nextTick(run);

  }

  // 将promise转化为Rejected状态，并依次执行then注册的onRejected回调函数
  _reject(error) {
    if (this._state !== 'Pending') return;

    let run = () => {
      this._state = 'Rejected';
      this._reason = error;

      let cb;
      while(cb = this.rejectCallbacks.shift()) {
        cb(error);
      }
    }

    process.nextTick(run);
  }

  // 注册回调函数，返回新的promise实例
  then(onFulfilled, onRejected) {

    let newPromise;

    return newPromise = new MyPromise((nextResolve, nextReject) => {
      let fulfillFunc = value => {
        if (typeof onFulfilled === 'function') {
          try {
            let res = onFulfilled(value);
            MyPromise.resolvePromise(newPromise, res);
          } catch(e) {
            nextReject(e);
          }
        } else {
          nextResolve(this._value);
        }
      }

      let rejectFunc = value => {
        if (typeof onRejected === 'function') {
          try {
            let res = onRejected(value);
            MyPromise.resolvePromise(newPromise, res);
          } catch(e) {
            nextReject(e);
          }
        } else {
          nextReject(this._reason);
        }
      }

      if (this._state === 'Pending') {
        this.fulfillCallbacks.push(fulfillFunc);
        this.rejectCallbacks.push(rejectFunc);
      } else if (this._state === 'Fulfilled') {
        fulfillFunc(this._value);
      } else if (this._state === 'Rejected') {
        rejectFunc(this._reason);
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(callBack) {
    return this.then(
      (value) => MyPromise.resolve(callBack()).then(() => value),
      (err) => MyPromise.resolve(callBack()).then(() => err)
    )
  }

  // promise的解决过程
  static resolvePromise(promise, val) {
    if (val === promise) {
      throw new Error('TypeError');
    } else if (val instanceof MyPromise) {
      if (val._state === 'Fulfilled') {
        promise._resolve(val._value);
      } else if (val._state === 'Rejected') {
        promise._reject(val._reason);
      } else {
        val.then(promise._resolve.bind(promise), promise._reject.bind(promise));
      }
    } else if (typeof val === 'object' || typeof val === 'function') {
      let then;
      try {
        then = val.then;
      } catch(e) {
        promise._reject(e);
      }
      if (typeof then === 'function') {
        then.call(val, function(value){
          this.resolvePromise(promise, value)
        }, nextReject)
      } else {
        promise._resolve(val);
      }
    } else {
      promise._resolve(val);
    }
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(value) {
    return new MyPromise((resolve, reject) => reject(value));
  }

  static all(promises) {
    if (!Array.isArray(promises)) throw new Error('参数必须为数组');

    return new MyPromise((resolve, reject) => {
      let values = [];
      let count = 0;

      for (let i=0; i<promises.length; i++) {
        this.resolve(promises[i]).then(value => {
          values[i] = value;
          count++;

          if (count === promises.length) resolve(values);
        }, (err) => {
          reject(err);
        });
      }
    });
  }

  static race(promises) {
    if (!Array.isArray(promises)) throw new Error('参数必须为数组');

    return new MyPromise((resolve, reject) => {

      for (let i=0; i<promises.length; i++) {
        this.resolve(promises[i]).then(value => {
          resolve(value);
        }, (err) => {
          reject(err);
        });
      }
    });
  }
}



// const p1 = new MyPromise((resolve, reject) => {
//   setTimeout(()=>{resolve(1)}, 500);
// })

// const p2 = new MyPromise((resolve, reject) => {
//   setTimeout(()=>{resolve(2)}, 100);
// })

// MyPromise.all([p1,p2]).then(values => {
//   console.log(values);
// })

// MyPromise.race([p1,p2]).then(values => {
//   console.log(values);
// })



// const p2 = new MyPromise((resolve, reject) => {
//   resolve(p1)
//   console.log(111);
// }).then((value) => {
//   console.log(value);
// });

const p1 = new Promise((resolve, reject) => {
  console.log(1);
  setTimeout(()=>{reject(1)}, 500);
});

Promise.resolve(p1).then(value => {
  console.log(value);
}, err => {
  console.log(err);
});

const p2 = new MyPromise((resolve, reject) => {
  console.log(2);
  setTimeout(()=>{reject(2)}, 500);
});

MyPromise.resolve(p2).then(value => {
  console.log(value);
}, err => {
  console.log(err);
});



// const p2 = new Promise((resolve, reject) => {
//   resolve(p1)
//   console.log(111);
// }).then((value) => {
//   console.log(value);
// });

