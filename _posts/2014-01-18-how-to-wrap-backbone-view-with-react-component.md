---
layout: blog_entry
title: "Quick n' dirty way to replace Backbone Views with React Components"
---

Suppose you're in the process of migrating a large [Backbone.js][1] application to [React][2] by replacing all of your Backbone Views with React Components. Ideally, you should do something like this:

* replace all `Backbone.View.extend` calls with `React.createComponent` calls
* move Backbone `initialize` code to React's `componentWillMount` method
* move Backbone `remove` code to React's `componentWillUnmount` method
* rewrite your `render` methods to return React virtual DOM nodes
* replace all of your `_.template()` calls with React virtual DOM nodes
* recursively do the same for all descendant nodes

There's a [good post by Clay Allsopp on Propeller's blog][3] on how to do just that. But if you aren't quite up for rewriting *every* view in your application just yet, you can use the following utility function to help you to wrap an existing Backbone View with a React Component.

{% highlight javascript %}
function viewToComponent(view) {
    var props = {};
    props.dangerouslySetInnerHTML = {'__html': view.render().el.innerHTML};
    if (view.id)
        props.id = view.id;
    if (view.className)
        props.className = view.className;
    return React.DOM[view.tagName](props);
}
{% endhighlight %}

The function `viewToComponent` takes a single argument, an instance of a Backbone View, and will return a React virtual DOM node. Here's how you might use it:

{% highlight javascript %}
var BoringView = Backbone.View.extend({
    render: function() {
        ...
        return this;
    }
});

var MyCoolComponent = React.createClass({
    render: function() {
        return React.DOM.div({}, viewToComponent(new BoringView({...})));
    }
});
{% endhighlight %}

[1]: http://backbonejs.org/
[2]: http://facebook.github.io/react/index.html
[3]: https://usepropeller.com/blog/posts/from-backbone-to-react/
