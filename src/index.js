import {multiply} from './helper/add.js';

import {add1} from './add.js';

import('./minus.js').then(({default:minus}) => {
  console.log(minus(4,1));
})

const b = add1(1,1);

const c = multiply(1,2);

console.log(b,c);