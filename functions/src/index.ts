/* eslint-disable camelcase */
import * as functions from "firebase-functions";

import * as crypto from "crypto";

// called Access token secret on the dev portal - is it right?
const CONSUMER_SECRET = functions.config().twitter.api_key_secret;

/**
 * Creates a HMAC SHA-256 hash created from the app TOKEN and
 * your app Consumer Secret.
 * @param {string} crcToken  the token provided by the incoming GET request
 * @return {string} challenge response blah
 */
const getChallengeResponse = (crcToken: string) => {
  if (typeof CONSUMER_SECRET !== "string") {
    throw new Error("no consumer secret");
  }
  const hmac = crypto
      .createHmac("sha256", CONSUMER_SECRET)
      .update(crcToken)
      .digest("base64");
  return hmac;
};
export const webhook = functions.https.onRequest((request, response) => {
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
    tweet_create_events?: Tweet;
  }


  const payload = request.body as AccountActivityEvent;

  // not a CRC, so we can assume typical webhook trigger
  console.log("payload: ", request.body);

  if (payload.tweet_create_events) {
    const tweet = payload.tweet_create_events;
    functions.logger.info("got tweet", tweet);
  }

  response.status(200).end();
});
