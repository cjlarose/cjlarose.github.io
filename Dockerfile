FROM     ubuntu
RUN      apt-get update && \
           apt-get install -y build-essential zlib1g-dev ruby-dev python
RUN      gem install bundler

WORKDIR  /data
ADD      Gemfile /data/Gemfile
RUN      bundle install

ADD      . /data
CMD      jekyll serve --watch
EXPOSE   4000
