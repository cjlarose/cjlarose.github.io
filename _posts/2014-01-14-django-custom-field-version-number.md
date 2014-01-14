---
layout: blog_entry
title: "Django custom model field for storing version numbers"
---

Consider you'd like to store version numbers like `v1.0`, `v2.0.3`, and `v5.4.3.2` in your Django application. One way to solve this problem is to store version numbers as strings, but the problem of sorting them becomes apparent: version `10.0` is more recent than version `2.0`, but compared lexicographically, `"10.0" > "2.0"` evaluates to `False`. You can chose to implement sorting on the Python side of the query result, by splitting on the `.` character and comparing components left-to-right, but ideally, we'd like our DBMS to handle sorting for us. 

One way to fix this is to zero-pad all components of the version: `"010.0" > "002.0"` evaluates to `True` as we'd expect. This is fine solution, and even with just three places for each component, you can reach reasonably high version numbers. Additionally, you can store arbitrarily-long version numbers like `"001.002.003.004.005.006"`.

The solution presented below takes another approach. Instead of storing version numbers as strings, we store them as 32-bit integers. We partition those 32 bits into four parts: major, minor, patch, and build. Using this scheme, we can unambiguously map any 4-part version number to a 32-bit integer. Unfortunately, this solution fixes the number of components you can represent in your version numbers, so this may not be the appropriate approach for your application.

{% highlight python %}
class VersionNumber(object):
    def __init__(self, major, minor=0, patch=0, build=0):
        self.number = (int(major), int(minor), int(patch), int(build))

    def __int__(self):
        major, minor, patch, build = self.number
        return major << 24 | minor << 16 | patch << 8 | build

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
        return "<VersionNumber(%d, %d, %d, %d)>" % self.number
{% endhighlight %}

In the `__int__` method of the `VersionNumber` class, we can see how the version number is mapped to an integer by using some bitwise arithmetic to store the major version in the highest 8 bits, the minor version in the next 8 bits, the patch in the next 8 bits, and the build number in the lowest 8 bits. Here, `__int__` will always return an `int` in the range `[0,4294967295]`.

{% highlight python %}
import struct
from django.db import models
class VersionNumberField(models.Field):
    """
    A version number. Stored as a integer. Retrieved as a VersionNumber. Like 
    magic. Major must not exceed 127. Minor, patch, build must not exceed 255.
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

        part_bytes = struct.pack(">I", value)
        part_ints = [ord(i) for i in part_bytes]
        return VersionNumber(*part_ints)

    def get_prep_value(self, value):
        """
        Convert a VersionNumber or tuple to an int
        """
        if isinstance(value, tuple):
            value = VersionNumber(*value) 
        if isinstance(value, int):
            return value

        return int(value)

    def value_to_string(self, obj):
        value = self._get_value_from_obj(obj)
        return self.get_db_prep_value(value)
{% endhighlight %}

In `get_internal_type`, we return `IntegerField` so that Django's ORM can pick the appropriate database type for storing our version numbers as integers. Something to take note of, though, is that Django's [IntegerField](https://docs.djangoproject.com/en/dev/ref/models/fields/#django.db.models.IntegerField) supports *signed* 32-bit integers (from `-2147483648` to `2147483647`), but our `VersionNumber`'s `__int__` implementation returns *unsigned* integers. This means that the greatest version number we can store is `127.255.255.255` instead of `255.255.255.255`. Unfortunately, there isn't an easy way out of this. Django doesn't provide a `UnsignedIntegerField`. You can [implement your own](http://stackoverflow.com/a/10678167/1231384), but the reason Django doesn't do it is a good one: not all supported DBMSs have an unsigned integer type, PostgreSQL being among them. In practice, though, `127.255.255.255` might be an acceptable limit for you application.
