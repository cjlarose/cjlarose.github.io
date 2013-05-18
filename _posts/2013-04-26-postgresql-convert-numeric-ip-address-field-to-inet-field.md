---
layout: blog_entry
title: "PostgreSQL: Convert numeric IP address field to INET field"
---
During a migration to PostgreSQL, I wanted to convert a column that held IP addresses represented as integers (numeric(10)) to PostgreSQL's inet field.  Here's how:

{% highlight postgresql %}
ALTER TABLE my_table ALTER COLUMN ip_address TYPE inet
USING '0.0.0.0'::inet + ip_address::bigint;
{% endhighlight %}
