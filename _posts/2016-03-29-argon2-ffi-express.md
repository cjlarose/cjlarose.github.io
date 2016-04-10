---
layout: blog_entry
title: "Tutorial: Handling users' passwords securely with Node.js using Argon2 and Express"
---

If you've decided that you need to store user passwords for your application, it's important to take steps to store them securely. If you're not familiar with password security at all, I recommend reading [NakedSecurity's post on the subject][naked]. In it, Ducklin describes the motivation for using randomly-generated salts and a hash-based key stretching algorithm like `PBKDF2`, `scrypt`, or `bcrypt`.

[naked]: https://nakedsecurity.sophos.com/2013/11/20/serious-security-how-to-store-your-users-passwords-safely/

In 2013, Jean-Philippe Aumasson, principal cryptographer at Switzerland-based Kudelski Security, announced the [Password Hashing Competition (PHC)][phc] as an open way to establish a new standard for password storage that would best protect against attackers. In July 2015, [Argon2][argon2] emerged as the victor, and has since become the "first choice" recommendation for password hashing by the [Open Web Application Security Project (OWASP)][owasp]. OWASP recommends using `PBKDF2`, `scrypt`, or `bcrypt` if a decent Argon2 implementation doesn't exist in your programming language.

[phc]: https://password-hashing.net/
[argon2]: https://github.com/P-H-C/phc-winner-argon2
[owasp]: https://www.owasp.org/index.php/Password_Storage_Cheat_Sheet

## Using Argon2 with Express

Imagine we're building a new web application using Express in Node.js and we'd like to use Argon2 to safely store passwords.

Let's begin a new project from scratch.

    mkdir express-argon2-example
    cd express-argon2-example
    npm init

Install Express and [argon2-ffi][argon2-ffi]. Disclaimer: I'm the author of `argon2-ffi`.

[argon2-ffi]: https://github.com/cjlarose/argon2-ffi

    npm install --save express argon2-ffi

Let's just get a basic Express server up. Paste this example from the [Express Hello World page][express-hello] into `server.js` at the root of your project.

[express-hello]: http://expressjs.com/en/starter/hello-world.html

```javascript
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

To make sure this works, execute `npm start`. You should see `Example app listening on port 3000!` printed to your console. If you visit `http://localhost:3000` in your browser, you should see a page that says "Hello World!" on it.

Now that we've got a server up and running, let's get into handling some passwords. There's basically two parts we need to get working: There's registration and then there's logging in. We'll handle registration first.

### User Registration

During registration, a user will provide a username and a password. We'll verify that no existing user has the same username and validate that the password is sufficiently long. Then, we'll compute the hash of the password using Argon2 and store the output. In a real-world application, you would probably store passwords in a database like PostgreSQL or MongoDB, but for the purpose of demonstration only, we're just going to store our users in an in-memory JavaScript Object whose keys are usernames and whose values are password hashes.

We're going to replace the Hello World route with one for creating new users. But first, let's install the Express middleware [body-parser][body-parser] so we can parse out JSON request bodies.

[body-parser]: https://github.com/expressjs/body-parser

    npm install --save body-parser

Now we can update `server.js` with the following:

```javascript
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var argon2i = require('argon2-ffi').argon2i;

var app = express();
var jsonParser = bodyParser.json();

var MIN_PASSWORD_LENGTH = 8;
var MAX_PASSWORD_LENGTH = 160;

var users = {};

app.post('/users', jsonParser, function (req, res) {
  if (!req.body) { return res.sendStatus(400); }

  if (!req.body.username || !req.body.password) {
    return res.status(400).send('Missing username or password');
  }

  if (users[req.body.username] !== undefined) {
    return res.status(409).send('A user with the specified username already exists');
  }

  if (req.body.password.length < MIN_PASSWORD_LENGTH ||
      req.body.password > MAX_PASSWORD_LENGTH) {
    return res.status(400).send(
      'Password must be between ' + MIN_PASSWORD_LENGTH + ' and ' +
      MAX_PASSWORD_LENGTH + ' characters long');
  }

  crypto.randomBytes(16, function (err, salt) {
    if (err) throw err;
    argon2i.hash(req.body.password, salt, function (err, hash) {
      if (err) throw err;
      users[req.body.username] = hash;
      res.sendStatus(201);
    });
  });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

We can test this by sending in a request to `http://localhost:9000/users` with a JSON body containing `username` and `password` keys. I like to use [Postman][postman] for things like this, but you can do this from the command line with good 'ole `curl`.

    curl -H "Content-Type: application/json" -X POST \
      -d '{"username":"cjlarose","password":"supersecret"}' \
      http://localhost:3000/users

If you run this, you should see `Created` printed to the console. If you run it again, you'll see `A user with the specified username already exists` printed instead.

[postman]: https://www.getpostman.com/

### Handling Login

If you take a look at the output of `argon2i.hash`, it'll look something like this:

    $argon2i$v=19$m=4096,t=3,p=1$BcemnsWZuevLbBkrUZ4dSg$n6RyfSTqOQpM0GAJ6PUebHxYfnAvk5ulSI+r71WOgYw

This format is called [Modular Crypt Format][mcf]. The string contains the algorithm (argon2i), the version number (19), the cost parameters (4096 KiB or memory, 3 iterations, and 1 thread), the salt, and finally, the result of hashing the salt and password. Conveniently, this is all the information we need to be able to verify the password when a user logs in.

[mcf]: http://pythonhosted.org/passlib/modular_crypt_format.html

Let's write a new route for our Express server that'll take a username and password and check to make sure they are correct.

```javascript
app.post('/sessions', jsonParser, function (req, res) {
  var encodedHash;
  var username;

  if (!req.body) { return res.sendStatus(400); }

  if (!req.body.username || !req.body.password) {
    return res.status(400).send('Missing username or password');
  }

  username = req.body.username;
  encodedHash = users[username];
  if (encodedHash === undefined) { return res.sendStatus(401); }

  argon2i.verify(encodedHash, req.body.password, function (err) {
    if (err) { return res.sendStatus(401); }
    return res.status(200).send('Welcome ' + username + '!');
  });
});
```

We can test this by creating a new user as we did before, then trying to log in with the same credentials:

    curl -H "Content-Type: application/json" -X POST \
      -d '{"username":"cjlarose","password":"supersecret"}' \
      http://localhost:3000/users
    curl -H "Content-Type: application/json" -X POST \
      -d '{"username":"cjlarose","password":"supersecret"}' \
      http://localhost:3000/sessions

You should see a nice welcome message printed to the console. We can see what happens if we use an incorrect password:

    curl -H "Content-Type: application/json" -X POST \
      -d '{"username":"cjlarose","password":"incorrectpassword"}' \
      http://localhost:3000/sessions

You should see `Unauthorized` printed to the screen.

## Going forward

As time marches on, computer hardware will continue to improve and make it easier for attackers to crack passwords. This is why algorithms like `PBKDF2`, `scrypt`, and `bcrypt` are all configurable in the amount of resources they use. `PBKDF2` and `bcrypt` both allow an application to specify the number of iterations to perform and `scrypt` allows one to specify a parameter that increases both CPU cost and memory cost. Similarly, `argon2` allows you to specify an iteration count, a memory cost, and a degree of parallelism independently, and the `argon2-ffi` library [exposes these options through a optional parameter][options]. The defaults are suitable for password hashing at the time of writing, but your application can increase them in the future if necessary.

[options]: https://github.com/cjlarose/argon2-ffi#hashing-a-password

## That's basically it!

Argon2 should be your first choice for password hashing in new projects. By using Node.js's `crypto` module, we can generate a suitably random salt, and by using `argon2-ffi` we can easily and safely store passwords. My only other note is a reminder that if you're sending passwords over the Web, make sure you're using SSL/TLS to transmit that information, otherwise your users' credentials are basically up for grabs by anyone on the same network.

Be safe and have fun!
