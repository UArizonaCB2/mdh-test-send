const mdh = require("./mdh");
const secretManager = require("./SecretsManager");
require("dotenv").config();

async function main(args) {
  // **NOTE!** In a real production app you would want these to be sourced from secrets manager. The .env file is just
  // a convenience for development.
  let rksProjectId = null;
  let notificationId = null;
  let rksServiceAccount = null;
  let privateKey = null;

  const secretName = process.env.AWS_SECRET_NAME;
  const surveyName = args.sid;

  // If we are in production system then MDH configuration will get loaded from the secrets manager.
  if (process.env.NODE_ENV === "production") {
    let secret = await secretManager.getSecret(secretName);
    secret = JSON.parse(secret);
    rksProjectId = secret["RKS_PROJECT_ID"];
    notificationId = args.nid;
    rksServiceAccount = secret["RKS_SERVICE_ACCOUNT"];
    privateKey = secret["RKS_PRIVATE_KEY"];
  } else {
    // Local / Non-production environment.
    // If We have passed the service account and private key path in the environment use that.
    if (process.env.RKS_SERVICE_ACCOUNT && process.env.RKS_PRIVATE_KEY) {
      console.log("Using MDH credentials from environment variables");
      rksServiceAccount = process.env.RKS_SERVICE_ACCOUNT;
      rksProjectId = process.env.RKS_PROJECT_ID;
      notificationId = args.nid;
      privateKey = process.env.RKS_PRIVATE_KEY;
    } else {
      console.log(
        "Fatal Error: RKS service account and RKS private key must be set in env variables.",
      );
      return null;
    }
  }

  // Needed when passing and storing the keys in \n escaped single lines.
  privateKey = privateKey.replace(/\\n/g, "\n");

  const token = await mdh.getAccessToken(rksServiceAccount, privateKey);
  if (token == null) {
    return null;
  }

  /*
   * Get all surveys that are correctly incomplete and belong to the env.EMA_CATEGORY
   * We would need send out a reminder notification for each of these.
   * */
  const surveyParams = {
    participantIdentifier: args.pid,
    status: "incomplete",
    surveyCategory: process.env.EMA_CATEGORY,
  };

  const incompleteSurveys = await mdh.getSurveyTasks(
    token,
    rksProjectId,
    surveyParams,
  );

  for (const surveyTask of incompleteSurveys.surveyTasks) {
    // Let's get the notification id associated with this survey task.
    let notification_survey_map = process.env.NOTIFICATION_SURVEY;
    notification_survey_map = notification_survey_map.split(",");
    for (const pair of notification_survey_map) {
      const pbuff = pair.split(":");
      if (pbuff.lenghth < 2) {
        // The environment variable was not correctly formualted. Nothing we can do.
        console.log(
          "Error : Malformed pair in environment variable NOTIFICATION_SURVEY - " +
            pair,
        );
        continue;
      }
      if (pbuff[1] === surveyTask.surveyName) {
        // Send out the notification associated with this survey task.
        await sendNotification(token, rksProjectId, args.pid, pbuff[0]);
        console.log(
          "Sending out reminder notification with ID - " +
            pbuff[0] +
            " to participant " +
            args.pid,
        );
      }
    }
  }

  return true;
}

// Method which sends a simple notification.
async function sendNotification(token, projectId, pid, nid) {
  const resourceUrl =
    "/api/v1/administration/projects/" + projectId + "/notifications";
  let params = [
    {
      participantIdentifier: pid,
      notificationIdentifier: nid,
      notificationFields: {},
    },
  ];

  return await mdh.postToApi(token, resourceUrl, params);
}

exports.main = main;
