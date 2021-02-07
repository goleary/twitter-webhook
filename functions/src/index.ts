/* eslint-disable camelcase */
import * as functions from "firebase-functions";

import * as firebase from "firebase-admin";

import {TwitterClient} from "twitter-api-client";

import * as crypto from "crypto";

const API_KEY = functions.config().twitter.api_key;
const API_KEY_SECRET = functions.config().twitter.api_key_secret;
const ACCESS_TOKEN = functions.config().twitter.access_token;
const ACCESS_TOKEN_SECRET = functions.config().twitter.access_token_secret;

firebase.initializeApp();

// const TWITTER_HANDLE = "g0leary";

/**
 * Creates a HMAC SHA-256 hash created from the app TOKEN and
 * your app Consumer Secret.
 * @param {string} crcToken  the token provided by the incoming GET request
 * @return {string} challenge response blah
 */
const getChallengeResponse = (crcToken: string) => {
  if (typeof API_KEY_SECRET !== "string") {
    throw new Error("no api key secret");
  }
  const hmac = crypto
      .createHmac("sha256", API_KEY_SECRET)
      .update(crcToken)
      .digest("base64");
  return hmac;
};

/**
  * @param {string} text text from which to extract URLs
  * @return {string[]} challenge response blah
*/
// const extractUrlsFromString = (text: string)=>{
//   return text.match(/\bhttps?:\/\/\S+/gi);
// };

// Types
// can probably get rid of this by using type from twitter-api-client
interface Tweet {
    created_at: string;
    id: number;
    id_str: string;
    text: string;
    user: any;
    entities: any;
    in_reply_to_status_id: number | null;
    in_reply_to_status_id_str: string | null;
    in_reply_to_user_id: number | null;
    in_reply_to_user_id_str: string | null;
    in_reply_to_screen_name: string | null;
  }


  interface AccountActivityEvent {
    for_user_id: string;
    is_blocked_by?: true;
    /**
     *   Tweet status payload when any of the following actions are taken by or
         to the subscription user: Tweets, Retweets, Replies, @mentions,
         QuoteTweets, Retweet of Quote Tweets. */
    tweet_create_events?: Tweet[];
  }

// define outside of function so it can be reused between function executions
const twitterClient = new TwitterClient({
  apiKey: API_KEY,
  apiSecret: API_KEY_SECRET,
  accessToken: ACCESS_TOKEN,
  accessTokenSecret: ACCESS_TOKEN_SECRET,
});

const logger = functions.logger;

export const webhook = functions.https.onRequest(async (request, response) => {
  // This secures the webhook using Challenge-Response Checks
  // https://developer.twitter.com/en/docs/twitter-api/premium/account-activity-api/guides/securing-webhooks
  const {crc_token: crcToken} = request.query;
  if (typeof crcToken === "string") {
    const json = {
      response_token: "sha256=" + getChallengeResponse(crcToken),
    };
    response.json(json).status(200).end();
    return;
  }

  const payload = request.body as AccountActivityEvent;

  // not a CRC, so we can assume typical webhook trigger
  // TODO: clean up branch logic
  if (payload.tweet_create_events && payload.tweet_create_events.length > 0) {
    const tweet = payload.tweet_create_events[0];
    logger.info("got tweet", tweet);
    const text = tweet.text;
    logger.info(`in_reply_to_screen_name: ${tweet.in_reply_to_screen_name}`);
    // if (tweet.in_reply_to_screen_name === TWITTER_HANDLE) {
    //   // does this mean it's a mention?
    //   logger.info('in_reply_to_screen_name: ')
    // }
    if (tweet.in_reply_to_status_id_str === null) {
      logger.info("Couldn't find tweet replying to", payload);
    } else if (text.toLowerCase().includes("save to upnext")) {
      logger.info("tweet contains 'save to upnext'");
      // find tweet it's responding to.
      const result = await twitterClient.tweets.statusesLookup({
        tweet_mode: "expanded",
        id: tweet.in_reply_to_status_id_str,
      });
      const originalTweet = result[0];
      if (originalTweet) {
        let url;
        logger.info("got original tweet", originalTweet);
        if (originalTweet.entities.urls &&
          originalTweet.entities.urls.length > 0
        ) {
          url = originalTweet.entities.urls[0].expanded_url;
        } else {
          url= buildUrlFromTweet(originalTweet);
        }
        logger.info(`found url to add: ${url}`);
        await addUrl(url);
        // TODO: post status confirming action (to twitter)
      }
    }
  }

  response.status(200).end();
});

const buildUrlFromTweet = (tweet:{id:number, user:{screen_name:string}} )=>{
  return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id}`;
};

const addUrl = (url:string)=>{
  return firebase.firestore().collection("urls").add({url});
};
