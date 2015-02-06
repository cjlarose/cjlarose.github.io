---
layout: blog_entry
title: A Makefile for OpenCL development
---

The [OpenCL Programming Guide for Mac][1] can get you up and running with
OpenCL development with a build process integrated into Xcode. If you don't
want to depend on Xcode, here's way to get your OpenCL workflow started with
a good 'ole Makefile.

Like in Apple's tutorial, assume you have a C file called `main.c` and an
OpenCl kernel file called `mykernel.cl`. Here's something to get you started:

{% gist 89de7d1d5863203dd30e %}

Use `make` to generate your executable `main`, and `make clean` to get rid of
all of the compiled files.

One interesting thing in this Makefile in the inclusion of `.SUFFIXES:`.
Without it, `make` will complain:

    make: Circular mykernel.cl <- mykernel.cl.c dependency dropped.

This is because `make` will include some [implicit rules][2] that we don't want
or need for our purposes.

[1]: https://developer.apple.com/library/mac/documentation/Performance/Conceptual/OpenCL_MacProgGuide/XCodeHelloWorld/XCodeHelloWorld.html
[2]: https://www.gnu.org/software/make/manual/html_node/Implicit-Rules.html
