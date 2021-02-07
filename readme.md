## Twitter Bot

This bot is designed to listen for tweets that mention the linked account
(g0leary here) with the text "save to upnext".  If this text is found it will
lookup the tweet the triggering tweet is in response to an attempt to extract a
URL. If there is no URL it defaults to the URL of this original tweet. It does
nothing if the triggering tweet is not in response to another tweet.

### Relevant Twitter endpoints to manage the twitter "bot"

base url: `https://api.twitter.com/1.1/`

- `GET` `account_activity/all/webhooks.json` - shows existing webhook URLs (requires Bearer token)
- `POST` `account_activity/all/sandbox/webhooks.json` - updates webhook URLs (requires full OAuth 1)
- `GET` `account_activity/all/sandbox/subscriptions.json` - checks if a subscription is set up for authenticated user (requires full OAuth 1)
- `POST` `account_activity/all/sandbox/subscriptions.json` - adds a subscription for the authenticated user (requires full OAuth 1)


More details on the Twitter API endpoints can be found [here](https://developer.twitter.com/en/docs/twitter-api/premium/account-activity-api/api-reference/aaa-premium).


### Notes

- In order to get full URLs return for a tweet you must provide `tweet_mode: extended` when fetching.
- The twitter api return "entities.urls" for a tweet, so there is no need to extract/parse the urls from the status text.