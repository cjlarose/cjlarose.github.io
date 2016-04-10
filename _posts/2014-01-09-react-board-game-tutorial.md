---
layout: blog_entry
title: "React beginner tutorial: implementing the board game Go"
---

[React][1] is &ldquo;a javascript library for building user interfaces&rdquo;. If you haven't done so already, I highly recommend you watch [Pete Hunt's presentation][2] on React's design principles. React is a relatively simple library, especially when compared to full-fledged MVC frameworks like Angular, Ember, Backbone, and the rest. It's a pleasure to work with, so let's get started.

Note: There's code fragments sprinkled throughout this post. To see the source code for the final application, check out my [Github repository][7].

Today, we'll be implementing the board game [Go][3]. If you don't know how to play, that's okay. All you need to know for now is that players alternate placing stones on intersections of the board's grid to capture their opponent's stones and claim the greatest amount of territory. Take a look at the [live preview][4] to get an idea of what we'll be building.

Let's start with `index.html`.

```html
<!DOCTYPE html>
<html>
  <head>
    <title>React Go Tutorial</title>
    <link type="text/css" href="style.css" rel="stylesheet" />
  </head>
  <body>
    <div id="main">
    </div>
    <script src="//cdnjs.cloudflare.com/ajax/libs/react/0.8.0/react.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/react/0.8.0/JSXTransformer.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js"></script>
    <script type="text/javascript" src="board.js"></script>
    <script type="text/jsx" src="go.js"></script>
  </body>
</html>
```

There's nothing too surprising here. Notice that we include `JSXTransformer.js`. This is React's preprocessor. It allows us to use a special custom syntax to describe our React views that's more akin to writing HTML than Javascript. While developing, relying on the client to preprocess your React files is fine, but when you go to production, make sure you [precompile those assets][5].  Please note that the dependency above on [Underscore.js][6] isn't necessary to build React apps, but I use it in my application logic because it provides some nice utility functions that Javascript doesn't give us out of the box.

## Application logic first

Above, I include both `board.js` and `go.js`. `board.js` contains all of the game logic. It's always a good idea to separate *application* logic from *presentation* logic, and React encourages this practice. Note that `board.js` has no dependency on React at all: it's just vanilla Javascript that we know and love.

```javascript
/*
 * board.js - Game logic for the board game Go
 */
var Board = function(size) {
    this.current_color = Board.BLACK;
    this.size = size;
    this.board = this.create_board(size);
    this.last_move_passed = false;
    this.in_atari = false;
    this.attempted_suicide = false;
};

Board.EMPTY = 0;
Board.BLACK = 1;
Board.WHITE = 2;

/*
 * Returns a size x size matrix with all entries initialized to Board.EMPTY
 */
Board.prototype.create_board = function(size) {
    var m = [];
    for (var i = 0; i < size; i++) {
        m[i] = [];
        for (var j = 0; j < size; j++)
            m[i][j] = Board.EMPTY;
    }
    return m;
};

/*
 * Switches the current player
 */
Board.prototype.switch_player = function() {
    this.current_color =
        this.current_color == Board.BLACK ? Board.WHITE : Board.BLACK;
};

/*
 * At any point in the game, a player can pass and let his opponent play
 */
Board.prototype.pass = function() {
    if (this.last_move_passed)
        this.end_game();
    this.last_move_passed = true;
    this.switch_player();
};

/*
 * Called when the game ends (both players passed)
 */
Board.prototype.end_game = function() {
    console.log("GAME OVER");
};

/*
 * Attempt to place a stone at (i,j). Returns true iff the move was legal
 */
Board.prototype.play = function(i, j) {
    console.log("Played at " + i + ", " + j);
    this.attempted_suicide = this.in_atari = false;

    if (this.board[i][j] != Board.EMPTY)
        return false;

    var color = this.board[i][j] = this.current_color;
    var captured = [];
    var neighbors = this.get_adjacent_intersections(i, j);
    var atari = false;

    var self = this;
    _.each(neighbors, function(n) {
        var state = self.board[n[0]][n[1]];
        if (state != Board.EMPTY && state != color) {
            var group = self.get_group(n[0], n[1]);
            console.log(group);
            if (group["liberties"] == 0)
                captured.push(group);
            else if (group["liberties"] == 1)
                atari = true;
        }
    });

    // detect suicide
    if (_.isEmpty(captured) && this.get_group(i, j)["liberties"] == 0) {
        this.board[i][j] = Board.EMPTY;
        this.attempted_suicide = true;
        return false;
    }

    var self = this;
    _.each(captured, function(group) {
        _.each(group["stones"], function(stone) {
            self.board[stone[0]][stone[1]] = Board.EMPTY;
        });
    });

    if (atari)
        this.in_atari = true;

    this.last_move_passed = false;
    this.switch_player();
    return true;
};

/*
 * Given a board position, returns a list of [i,j] coordinates representing
 * orthagonally adjacent intersections
 */
Board.prototype.get_adjacent_intersections = function(i , j) {
    var neighbors = [];
    if (i > 0)
        neighbors.push([i - 1, j]);
    if (j < this.size - 1)
        neighbors.push([i, j + 1]);
    if (i < this.size - 1)
        neighbors.push([i + 1, j]);
    if (j > 0)
        neighbors.push([i, j - 1]);
    return neighbors;
};

/*
 * Performs a breadth-first search about an (i,j) position to find recursively
 * orthagonally adjacent stones of the same color (stones with which it shares
 * liberties). Returns null for if there is no stone at the specified position,
 * otherwise returns an object with two keys: "liberties", specifying the
 * number of liberties the group has, and "stones", the list of [i,j]
 * coordinates of the group's members.
 */
Board.prototype.get_group = function(i, j) {

    var color = this.board[i][j];
    if (color == Board.EMPTY)
        return null;

    var visited = {}; // for O(1) lookups
    var visited_list = []; // for returning
    var queue = [[i, j]];
    var count = 0;

    while (queue.length > 0) {
        var stone = queue.pop();
        if (visited[stone])
            continue;

        var neighbors = this.get_adjacent_intersections(stone[0], stone[1]);
        var self = this;
        _.each(neighbors, function(n) {
            var state = self.board[n[0]][n[1]];
            if (state == Board.EMPTY)
                count++;
            if (state == color)
                queue.push([n[0], n[1]]);
        });

        visited[stone] = true;
        visited_list.push(stone);
    }

    return {
        "liberties": count,
        "stones": visited_list
    };
}
```

An instance of the `Board` class has several attributes that describe what a game of Go looks like at a particular moment in time. This is a common paradigm in React: get familiar with building models that have attributes that can be used by themselves to build your views. Let's take a look at how a `Board` is represented.

* `Board.size` stores an integer representing the dimensions of the game board. Go games are played on a square grid, typically consisting of 19x19 intersections, but beginners sometimes play on smaller 9x9 and 13x13 boards.
* `Board.current_color` stores an integer that identifies whose turn it is. Because the player with the black stones plays first, we initialize `this.current_color` to `Board.BLACK`.
* `Board.board` is an integer matrix that stores which color stones occupy which spaces. Because the board starts empty, we initialize every cell to `Board.EMPTY`.
* A game of Go ends when both players pass their turns consecutively. If a player passes his turn, we set `Board.last_move_passed` so that if the next move is also a pass, we can detect that the game has ended.
* When a player threatens his opponent, we set the flag `Board.in_atari` to true, so we can alert the player in danger. In Go, this is considered to be polite.
* Finally, we set the `Board.attempted_suicide` flag if a user made an invalid move &mdash; one that would mean suicide for their piece.

## The fun part: building React Components

Now we have a good representation of the board game in pure Javascript. We can use the methods `Board.pass()` and `Board.play(i, j)` to change the game's state. All other methods are only used by the `Board` class internally. Let's start putting our UI together with React.

What follows is several segments of `go.js`, where we build our React components. To see the file in full, [check it out on Github][8]. We begin the file with a comment declaring that this file should be preprocessed by [JSX][5]. Also, we create a constant called `GRID_SIZE`, which will store the pixel dimensions of a grid square on our game board.

```javascript
/** @jsx React.DOM */
var GRID_SIZE = 40;
```

Next, let's build out first React component. This one's pretty simple.  It represents a single grid intersection on the Go board.

```javascript
var BoardIntersection = React.createClass({
    handleClick: function() {
        if (this.props.board.play(this.props.row, this.props.col))
            this.props.onPlay();
    },
    render: function() {
        var style = {
            top: this.props.row * GRID_SIZE,
            left: this.props.col * GRID_SIZE
        };

        var classes = "intersection ";
        if (this.props.color != Board.EMPTY)
            classes += this.props.color == Board.BLACK ? "black" : "white";

        return (
            <div onClick={this.handleClick}
                className={classes} style={style}></div>
        );
    }
});
```

BoardIntersection has several properties that we can pass when we initialize an instance:

* `BoardIntersection.board` is the instance of `Board` we're representing.
* `BoardIntersection.color` represents which color stone, if any, occupies this intersection.
* `BoardIntersection.row` and `BoardIntersection.col` represent the `(i,j)` position of this intersection.
* `BoardIntersection.onPlay` is a function we'll pass in that we want to be executed whenever a move is executed on the game `Board`. We'll call this function whenever a player clicks on the intersection.

Next, let's build the Component that represents the game board.

```javascript
var BoardView = React.createClass({
    render: function() {
        var intersections = [];
        for (var i = 0; i < this.props.board.size; i++)
            for (var j = 0; j < this.props.board.size; j++)
                intersections.push(BoardIntersection({
                    board: this.props.board,
                    color: this.props.board.board[i][j],
                    row: i,
                    col: j,
                    onPlay: this.props.onPlay
                }));
        var style = {
            width: this.props.board.size * GRID_SIZE,
            height: this.props.board.size * GRID_SIZE
        };
        return <div style={style} id="board">{intersections}</div>;
    }
});
```

BoardView has only two properties we'll use: `BoardView.board` and `BoardView.onPlay`. These properties play the same roles here as they did in `BoardIntersection`. In the `render` method of this Component, we create n x n instances of `BoardIntersection` and add them each in as children.

Next, we create a few more components: one to display alert messages and another that provides a button to pass your turn.

```javascript
var AlertView = React.createClass({
    render: function() {
        var text = "";
        if (this.props.board.in_atari)
            text = "ATARI!";
        else if (this.props.board.attempted_suicide)
            text = "SUICIDE!";

        return (
            <div id="alerts">{text}</div>
        );
    }
});

var PassView = React.createClass({
    handleClick: function(e) {
        this.props.board.pass();
    },
    render: function() {
        return (
            <input id="pass-btn" type="button" value="Pass"
                onClick={this.handleClick} />
        );
    }
});
```

Finally, we build a component to wrap all of our sub-Components up. We initialize an instance of our model, and call `React.renderComponent` to bind a Component to a DOM element.

```javascript
var ContainerView = React.createClass({
    getInitialState: function() {
        return {'board': this.props.board};
    },
    onBoardUpdate: function() {
        this.setState({"board": this.props.board});
    },
    render: function() {
        return (
            <div>
                <AlertView board={this.state.board} />
                <PassView board={this.state.board} />
                <BoardView board={this.state.board}
                    onPlay={this.onBoardUpdate.bind(this)} />
            </div>
        )
    }
});

var board = new Board(19);

React.renderComponent(
    <ContainerView board={board} />,
    document.getElementById('main')
);
```

The `ContainerView` is our only stateful Component. It has exactly one property of its state: `board`, which is initialized to the `board` passed to it via its `props`. We pass a callback function called `this.onBoardUpdate` to the `BoardView`, so we can be notified when the board has changed.

## How it all works

In the `onBoardUpdate` callback, we call `this.setState`, which notifies React that our model has changed, and React should then re-render our component so that it reflects the current model state. This is where the magic of React comes in: we can naively pretend that every time we call `this.setState`, React replaces our DOM element with whatever was returned by our Component's `render` method.  In practice, this is all you have to know, and for the most part, we can go on happily thinking in this way.

In practice, it's much too expensive to actually do all of that DOM manipulation every time the application state changes. So behind the scenes, React actually computes the minimal set of changes in the virtual DOM representation returned by a Component's `render` method each time `setState` is called, then performs only those updates. In our case, that usually just means changing a single class name of a `<div>` that represents a board intersection, or possibly several, if you capture your opponent's stones.

React simplifies the process of writing application UIs because we don't have to think about how our model changes over time and how our view responds incrementally, all while incurring only marginal performance penalty. It's really a pleasure to work with, and I hope that it gains traction and sets a paradigm moving forward in the Javascript MVC scene.

[1]: http://facebook.github.io/react/
[2]: http://www.youtube.com/watch?v=x7cQ3mrcKaY
[3]: http://en.wikipedia.org/wiki/Go_(game)
[4]: http://cjlarose.com/react-go
[5]: http://facebook.github.io/react/docs/tooling-integration.html#jsx
[6]: http://underscorejs.org/
[7]: https://github.com/cjlarose/react-go
[8]: https://github.com/cjlarose/react-go/blob/master/go.js
