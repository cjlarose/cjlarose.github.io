---
layout: blog_entry
title: "Lessons learned from Advent of Code 2016: Haskell solutions"
---

This December, I decided to tackle the [Advent of Code Problems][aoc-2016] in Haskell. Although I'd used Haskell from time to time on hobby projects, I had never been completely comfortable with it. AoC was a great opportunity to write Haskell almost every day for a month, and I'd like to share what I've learned. Hopefully it'll help someone who's getting started with Haskell. I'll inject links to relevant parts of the code throughout the post, but if you'd just like to skip to the code, you're welcome to check out the [Github repo][repo].

[aoc-2016]: http://adventofcode.com/2016
[repo]: https://github.com/cjlarose/advent-2016

## Use infinite lists like lazy iterators in other languages

Haskell's most accessible data structure is the (linked) list.

Day 14: One Time Pad
Day 18: Rogue

## Use the Applicative and Functor instances of Parsec when possible

I've found this rule of thumb to be helpful: Use the Monad instances of ParsecT when you need context-sensitivity--otherwise, just use the Applicative and Functor instances.

[day3-refactor]: https://github.com/cjlarose/advent-2016/commit/7681066b9aec397a28b1b75fa7d82de8b677579b
[rwh]: http://book.realworldhaskell.org/read/using-parsec.html#id652399

## Profile your code when it is too slow

For a handful of the Advent of Code problems, calculating a solution was computationally expensive. I knew that sometimes this meant that I couldn't get away with a naive approach and needed to use a more efficient algorithm. Other times, though, the algorithm was fine, but the code was just slow. In these times, using GHC's profiler was nice to be able to pin down exactly what was slow.

While doing [Day 5: How About a Nice Game of Chess?][day5-desciption], I found that my solution ran too slowly to produce a result in any reasonable amount of time. Because the program involves performing a bunch of iterations of the MD5 hashing algorithm, I imagined that my performance bottleneck had to do with running the function that actually performed MD5 hashing. I ran GHC's profiling tool, and was surprised that the bottleneck was in transforming a `String` into a `ByteString`.

I needed to turn a `String` into a `ByteString` so I could feed it into `Crypto.Hash.MD5`. After some Googling and searching on Stack Overflow, I added the `utf8-string` package and used `Data.ByteString.UTF8.fromString`.

[day5-desciption]: http://adventofcode.com/2016/day/5

```
stack build --executable-profiling --library-profiling --ghc-options="-fprof-auto -rtsopts"
```

```
stack exec -- advent2016 21
```

## Debug your code with Debug.Trace

Using `ghci` can be very helpful to exercise your Haskell functions in isolation when you're debugging. Sometimes, though, you just need to figure out what's going on in your program by printing some values to the console. In JavaScript, you could add some `console.log` statements, and in Python you could `print` what you need. 
But Haskell represents side effects (like writing to `STDOUT`) explicitly in its type system, so you might think that it would be difficult to do something similar. In fact, there's a backdoor of sorts in `Debug.Trace` that allows you to write debugging statements without changing the type signature of the function you're debugging.

Add this import statement to your Haskell file.

```
import Debug.Trace (traceShow)
```

Use it like this


```
```

## Run hlint on your code

Control.Arrow what?

[day6-part1]: https://github.com/cjlarose/advent-2016/commit/eafef0a97cd89a80c62b5ec2c64e080f83730cf6

## Represent data structures along with positions within those structures using zippers

Day 11: Generators

## Use the State monad when it's cumbersome to represent all updates explicitly

Day 10: Balance Bots, Day 12: Monorail

## Consider skipping intermediate representations in your parser

Reference reddit thread
Day 15: Worked well
Day 21: Didn't work well (brute force to be lazy)

## Other resources

The Haskell ecosystem gets a bad rap for having miserable dependency management. If you're starting a new project with Haskell, I recommend using Stack.

[stack-tutorial]: http://seanhess.github.io/2015/08/04/practical-haskell-getting-started.html

LYAH
