FROM ruby:3.3-slim

# git is required at runtime: the server clones repositories to run RuboCop on
# them. build-essential is needed to compile puma's native extension.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment true \
    && bundle install --jobs 4

COPY server.rb config.ru ./

# Non-root user; repo clones happen in /app/work
RUN useradd --create-home app \
    && mkdir /app/work \
    && chown -R app:app /app
USER app
WORKDIR /app/work

EXPOSE 3000

CMD ["bundle", "exec", "ruby", "/app/server.rb"]
