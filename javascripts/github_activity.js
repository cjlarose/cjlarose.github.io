$.fn.githubActivity = function(options) {

    var render_activity = function(data) {
        var push_events = $.grep(data.data, function(d) {return d.type == "PushEvent"});
        var items = $.map(push_events.slice(0,5), function(d) {
            var date = moment(d.created_at);
            var $date = $("<time>").attr('datetime', date.format()).append(date.fromNow());

            var repo_url = "https://github.com/" + d.repo.name;

            var $commits = $.map(d.payload.commits, function (c) {
                var $sha = $("<a>")
                    .attr('href', repo_url + "/commit/" + c.sha)
                    .append(c.sha.slice(0,7));
                return $("<li>").append($sha).append(" ").append(c.message);
            });

            var $repo_link = $("<a>").attr('href', repo_url).append(d.repo.name);
            return $("<li>")
                .append($date)
                .append(" on ").append($repo_link)
                .append($("<ul>").append($commits));
        });

        return $("<ul>").append(items);
    };

    var self = this;
    var github_url = "https://api.github.com/users/" + options.username + "/events?callback=?";
    $.getJSON(github_url, function( data ) {
        if (data.meta.status == 200)
            self.append(render_activity(data));
    });
};
