---
layout: blog_entry
title: "Django custom model field for storing version numbers"
---

Consider that you'd like to store version numbers like `v1.0`, `v2.0.3`, and `v5.4.3.2` in your Django application. One way to solve this problem is to store version numbers as strings, but the problem of sorting them becomes apparent: version `10.0` is more recent than version `2.0`, but compared lexicographically, `"10.0" > "2.0"` evaluates to `False`. You can choose to implement sorting on the Python side of the query result, by splitting on the `.` character and comparing components left-to-right, but ideally, we'd like our DBMS to handle sorting for us. 

One way to fix the lexicographical sort problem is to zero-pad all components of the version: `"010.0" > "002.0"` evaluates to `True` as we'd expect. This is fine solution, and even with just three places for each component, you can reach reasonably high version numbers. Additionally, you can store arbitrarily-long version numbers like `"001.002.003.004.005.006"`.

The solution presented below takes another approach. Instead of storing version numbers as strings, we store them as 32-bit integers. We partition those 32 bits into four parts: major, minor, patch, and build. Using this scheme, we can unambiguously map any 4-part version number to a 32-bit integer. Unfortunately, this solution fixes the number of components you can represent in your version numbers, so this may not be the appropriate approach for your application.

```python
class VersionNumber(object):
    def __init__(self, major, minor=0, patch=0, build=0):
        self.number = (int(major), int(minor), int(patch), int(build))
        if any([i < 0 or i > 255 for i in self.number]):
            raise ValueError("Version number components must between 0 and 255,"
                             " inclusive")

    def __int__(self):
        """
        Maps a version number to a two's complement signed 32-bit integer by
        first calculating an unsigned 32-bit integer in the range [0,2**32-1],
        then subtracts 2**31 to get a number in the range [-2*31, 2**31-1].
        """
        major, minor, patch, build = self.number
        num =  major << 24 | minor << 16 | patch << 8 | build
        return num - 2**31

    def __str__(self):
        """
        Pretty printing of version number; doesn't print 0's on the end
        """
        end_index = 0
        for index, part in enumerate(self.number):
            if part != 0:
                end_index = index

        return ".".join([str(i) for i in self.number[:end_index+1]])

    def __repr__(self):
        return "<%s.%s%s>" % (
            self.__class__.__module__, 
            self.__class__.__name__, 
            repr(self.number)
        )
```

In the `__int__` method of the `VersionNumber` class, we can see how the version number is mapped to an integer by using some bitwise arithmetic to store the major version in the highest 8 bits, the minor version in the next 8 bits, the patch in the next 8 bits, and the build number in the lowest 8 bits. Here, `__int__` will always return an `int` in the range `[-2147483648, 2147483647]`.

```python
import struct
from django.db import models

class VersionNumberField(models.Field):
    """
    A version number. Stored as a integer. Retrieved as a VersionNumber. Like 
    magic. Major, minor, patch, build must not exceed 255
    """
    __metaclass__ = models.SubfieldBase

    def get_internal_type(self):
        return 'IntegerField'
    
    def to_python(self, value):
        """
        Convert a int to a VersionNumber
        """
        if value is None:
            return None
        if isinstance(value, VersionNumber):
            return value
        if isinstance(value, tuple):
            return VersionNumber(*value)

        part_bytes = struct.pack(">I", value + 2**31)
        part_ints = [ord(i) for i in part_bytes]
        return VersionNumber(*part_ints)

    def get_prep_value(self, value):
        """
        Convert a VersionNumber or tuple to an int
        """
        if isinstance(value, VersionNumber):
            return int(value)
        if isinstance(value, tuple):
            return int(VersionNumber(*value))
        if isinstance(value, int):
            return value

    def value_to_string(self, obj):
        value = self._get_val_from_obj(obj)
        return self.get_prep_value(value)
```

In `get_internal_type`, we return `IntegerField` so that Django's ORM can pick the appropriate database type for storing our version numbers as integers. Something to take note of is that Django's [IntegerField][1] supports *signed* 32-bit integers (from `-2147483648` to `2147483647`). This is why our `VersionNumber`'s `__int__` implementation returns integers in the same range.

Then, to use `VersionNumberField` in your models:

```python
class Program(models.Model):
    name = models.CharField(max_length=200)
    version_number = VersionNumberField(default=VersionNumber(1,))
```

So you can use your model like so:

```python
>>> from programs.models import VersionNumber, Program
>>> p = Program(name="My Cool App", version_number=VersionNumber(1,2,3))
>>> p.save()
>>> p.version_number
<programs.models.VersionNumber(1, 2, 3, 0)>
>>> str(p.version_number)
'1.2.3'
```

Looking at all of these strange additions subtractions to `2**31`, it seems like it would be nice if Django provided an UnsignedIntegerField, but it doesn't. You can [implement your own][2], but the reason Django doesn't do it is a good one: not all supported DBMSs have an unsigned integer type, PostgreSQL being among them. 

Our `VersionNumberField` can store version numbers from `0.0.0.0` to `255.255.255.255`. That range might look familiar because it's the same range as IPv4 addresses. This of course, should come as no surprise because IPv4 addresses *are* 32-bit integers&mdash;we mere humans just prefer the dot-decimal notation. Out of curiosity, I took at look at Django's (soon-to-be-deprecated) [IPAddressField][3] to see if they do something similar. Turns out, they don't. In [MySQL][7] and [SQLite][8], Django uses a `char(15)` field. Similarly, Django uses a `VARCHAR2(15)` in [Oracle][6]. In [PostgreSQL][5], Django uses the `inet` field, which [according to the documentation][4] stores both IPv4 and IPv6 host addresses with an optional netmask. It seems intuitive that storing IPv4 address as integers instead of as strings would save space as well as time on `ORDER BY` queries, so it's a curious anecdote.

[1]: https://docs.djangoproject.com/en/1.6/ref/models/fields/#integerfield
[2]: http://stackoverflow.com/a/10678167/1231384
[3]: https://docs.djangoproject.com/en/1.6/ref/models/fields/#ipaddressfield
[4]: http://www.postgresql.org/docs/8.2/static/datatype-net-types.html
[5]: https://github.com/django/django/blob/3bc0d46a840f17dce561daca8a6b8690b2cf5d0a/django/db/backends/postgresql_psycopg2/creation.py#L24
[6]: https://github.com/django/django/blob/3bc0d46a840f17dce561daca8a6b8690b2cf5d0a/django/db/backends/oracle/creation.py#L36
[7]: https://github.com/django/django/blob/3bc0d46a840f17dce561daca8a6b8690b2cf5d0a/django/db/backends/mysql/creation.py#L23
[8]: https://github.com/django/django/blob/3bc0d46a840f17dce561daca8a6b8690b2cf5d0a/django/db/backends/sqlite3/creation.py#L26
