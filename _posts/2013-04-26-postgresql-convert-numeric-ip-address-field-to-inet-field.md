---
layout: blog_entry
title: "PostgreSQL: Convert numeric IP address field to INET field"
---
Recall that an IPv4 address can be represented as a 32-bit integer. In many RDBMSs, this means that a 10-digit numeric field is sufficient. In this case, your application would have to handle the conversion from integer to strings like "127.0.0.1" and back again for `INSERT` and `UPDATE` operations. But if you're using PostgreSQL, you can use the `inet` field and have the string conversion handled automagically and your heart can rest easy knowing that the address is stored efficiently.

In my case, after a migration from MySQL, I ended up with a `numeric(10)` field and I wanted to convert it to a `inet` field. Here's how I did it:

```sql
ALTER TABLE my_table ALTER COLUMN ip_address TYPE inet
USING '0.0.0.0'::inet + ip_address::bigint;
```

There is no conversion defined from `numeric` to `inet`, so `ip_address::inet` would fail. So here we take advantage of addition being defined for `inet` and `bigint` operands to accomplish the conversion.
