---
layout: blog_entry
title: Externalizing Backbone.js templates into separate files
---
So plenty of the [Backbone.js](http://backbonejs.org/) tutorials ask you to define your [Underscore templates](http://underscorejs.org/#template) within &lt;script&gt; tags.  For example, Thomas Davis shows this template in [his tutorial](http://backbonetutorials.com/what-is-a-view/):

```erb
<script type="text/template" id="search_template">
    <!-- Access template variables with <%= %> -->
    <label><%= search_label %></label>
    <input type="text" id="search_input" />
    <input type="button" id="search_button" value="Search" />
</script>
```

This is handy for small apps and for just learning to work with Backbone.js.  But if you think it's ugly, you're not alone.  They're not just ugly, though.  Consider initializing your Backbone views with something like:

```javascript
var App.Views.SearchView = Backbone.View.extend({
    template: _.template($('#search_template').html()),
    render: function() {
      this.$el.html(this.template({"search_label": "some label"}));
    }
    // blah, blah, blah
});
```

This means that if you want to initialize your views like this, you'd have to wait until after the DOMContentLoaded event to fire to ensure that $('#search_template') actually gets that element.  Maybe that's not a big deal to you.  But editing a super long HTML file with a bunch of hacky &lt;script&gt; elements is not a fun development workflow. That's lame.  We can do better.

[Some](http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/) recommend putting those templates into separate .html files and getting them all via AJAX.  That's really nice for workflow, but it's really expensive if you have a lot of templates.  We can do better, still. Rico Sta Cruz [recommends using JST Templates](http://ricostacruz.com/backbone-patterns/#jst_templates).  This means that you define your templates in separate files on the server, and your server-side code takes care of putting it all together into a single JavaScript file.  This is ideal, in my opinion, for most projects.  And if you're using Rails, [EJS](http://embeddedjs.com/) will do the heavy lifting for you.

But if you're not using Rails, you might want to roll your own solution.  Maybe you're running a Django app.  Let's write a view function that will return a dynamically-generated JavaScript file that includes all of our Underscore templates.

```python
from django.template import Context
from django.template.loader import get_template
def compile_templates:
    template = get_template("templates.js")
    templates_path = os.path.join(settings.root_dir, 'static', 'js', 'templates')
    template_dict = []

    for root, dirs, files in os.walk(templates_path):
        for f in files:
            fullpath = os.path.join(root, f)
            name, ext = os.path.splitext(f)
            file = open(fullpath, 'r')
            output = file.read()
            template_dict[name] = output

    context = Context({"templates": template_dict})
    return template.render(context)
```

Your corresponding templates.js template might look something like:

```
{% raw %}App.Templates = {}

{% for name, text in templates.items %}
App.Templates["{{ name }}"] = "{{ text|escapejs }}";
{% endfor %}{% endraw %}
```

Note: Don't do this in a production environment.  I/O operations are slow. When you transition to a production environment, you should serve a copy of this file that's been pregenerated.  Anyways, this view gives you an associative array of your templates.  So you can define your templates like this:

```erb
<!-- static/js/templates/search.html -->
<label><%= search_label %></label>
<input type="text" id="search_input" />
<input type="button" id="search_button" value="Search" />
```

And your view like this:

```javascript
var App.Views.SearchView = Backbone.View.extend({
    template: _.template(App.Templates['search']),
    render: function() {
      this.$el.html(this.template({"search_label": "some label"}));
    }
    // blah, blah, blah
});
```

I think the extra effort to serve your templates like this is worth the advantages in easing your development workflow.  I hope you'll think so, too.
