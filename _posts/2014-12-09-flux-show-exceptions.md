---
layout: blog_entry
title: "Show exceptions from Flux Dispatcher callbacks"
---

[Flux][1] is a frontend application architectural pattern by Facebook. Being an
architectural pattern, it's largely a do-it-yourself kind of deal. That is,
except for an implementation of the Dispatcher, which is provided in the
[`flux`][2] package on npm.

The Dispatcher accepts callbacks with its `register` method, and invokes those
callbacks anytime an action is `dispatch`ed to it. One curious behavior of the
Dispatcher, though, is that it will eat any exception that occurs in a callback,
and keep chugging along. Presumably, this is so that one failing callback
doesn't cause the whole application to blow up. It has the effect, though, of
making debugging incredibly painful.

Here's how to get exceptions to show up in your console again, assuming you have
a subclass of `Dispatcher` called `AppDispatcher`, as in the
[TodoMVC example][3]. First, we'll define a function that logs errors of the
function it's passed:

```javascript
var vomitify = function(f) {
  return function() {
    try {
      f.apply(this, arguments);
    } catch(e) {
      console.error(e.stack);
    }
  }
};
```

*Note: Here, we reference the `console` object, which will fail spectacularly in
older versions of IE when you don't have the developer console open. Make sure
you don't run this in production, or if you do, make sure to [redefine
console][4] safely.*

Now, we'll override the `dispatch` method of `AppDispatcher` to use `vomitify`.

```javascript
var Dispatcher = require('flux').Dispatcher;
var assign = require('object-assign');

var AppDispatcher = assign(new Dispatcher(), {

  handleViewAction: function(action) {
    console.log(action);
    this.dispatch({
      source: 'VIEW_ACTION',
      action: action
    });
  },

  handleServerAction: function(action) {
    console.log(action);
    this.dispatch({
      source: 'SERVER_ACTION',
      action: action
    });
  },

  register: function(f) {
    return Dispatcher.prototype.register.call(this, vomitify(f));
  }

});

module.exports = AppDispatcher;
```


That's it! Now your exceptions will be logged to the console again. Happy
debugging!

[1]: https://github.com/facebook/flux
[2]: https://www.npmjs.org/package/flux
[3]: https://github.com/facebook/flux/blob/c858b918bf4dca1a116ff2ef8fe3e098ab2a9710/examples/flux-todomvc/js/dispatcher/AppDispatcher.js
[4]: http://stackoverflow.com/questions/1114187/is-it-a-bad-idea-to-leave-firebug-console-log-calls-in-your-producton-javascri
