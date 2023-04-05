# Refunc

A library for incremental computation.

## Tutorial

```js
// This is a function packaged as a refunction,
// but it doesn't do any actual remembering.

const squareForgetful = hooks((x) => {
  console.log('squaring', x)
  return x * x;
});

// Every time we run it, we get a 'squaring' log.

var mem = new RefuncMemory();
console.log(squareForgetful(mem, 3));
// → squaring 3
// → 9
console.log(squareForgetful(mem, 3));
// → squaring 3
// → 9
console.log(squareForgetful(mem, 4));
// → squaring 4
// → 9
console.log(squareForgetful(mem, 4));
// → squaring 4
// → 9


// This refunction wraps the squaring work in `hookMemo`.
// It will keep the result of this work around in
// case it gets called again with the same input.

const square = hooks((x) => {
  const squared = hookMemo(() => {
    console.log('squaring', x)
    return x * x;
  }, [x]);
  return squared;
});

// Now repeated calls to `square` only do the
// squaring work once!

var mem = new RefuncMemory();
log(square(mem, 3));
// → squaring 3
// → 9
log(square(mem, 3));
// → 9
log(square(mem, 4));
// → squaring 4
// → 16
log(square(mem, 4));
// → 16
// But note that we only remember the very
// latest input:
log(square(mem, 3));
// → squaring 3
// → 9


// This refunction squares both of its arguments using
// the previously defined `square`. It uses
// `hookRefunc`, which makes the memories of these
// two calls part of the memory of the new

const twoSquares = hooks((x, y) => {
  const xSquared = hookRefunc(square, x);
  const ySquared = hookRefunc(square, y);
  return [xSquared, ySquared];
});

// Now each of the squarings is memoized.

var mem = new RefuncMemory();
log(twoSquares(mem, 3, 4));
// → squaring 3
// → squaring 4
// → [ 9, 16 ]
log(twoSquares(mem, 3, 4));
// → [ 9, 16 ]
log(twoSquares(mem, 3, 5));
// → squaring 5
// → [ 9, 25 ]
// But note that no memory is shared between the
// x-call and the y-call:
log(twoSquares(mem, 4, 4))
// → squaring 4
// → squaring 4
// → [ 16, 16 ]


// This refunction receives an object with numeric
// values and squares all the values. It uses
// `square` to memoize the squaring of each value.
// However, the number of values varies, so we
// cannot simply call `hookRefunc` in a loop.
// Instead, we use `hookFork` to spawn a variable
// number of keyed branches.

const keyedSquares = hooks((nums) => {
  const results = {};
  hookFork((branch) =>
    Object.entries(nums).forEach(([key, num]) =>
      branch(key, () => {
        results[key] = hookRefunc(square, num);
      })
    )
  )
  return results;
})

// It behaves like you'd expect.

var mem = new RefuncMemory();
log(keyedSquares(mem, {a: 3      }));
// → squaring 3
// → { a: 9 }
log(keyedSquares(mem, {a: 3, b: 4}));
// → squaring 4
// → { a: 9, b: 16 }
log(keyedSquares(mem, {a: 3, b: 4}));
// → { a: 9, b: 16 }
log(keyedSquares(mem, {a: 3, b: 5}));
// → squaring 5
// → { a: 9, b: 25 }
log(keyedSquares(mem, {      b: 5}));
// → { b: 25 }
```
