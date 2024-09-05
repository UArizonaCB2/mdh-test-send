const jwt = require('jsonwebtoken');
const axios = require('axios');
const util = require('util');
const querystring = require('querystring');
const { v4: uuidv4 } = require('uuid');

const baseApiUri = 'https://designer.mydatahelps.org';

async function getFromApi(accessToken, resourceUrl, queryParams = {}) {
  var data = null;
  let api = axios.create({
    baseURL: baseApiUri,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8"
    }
  });

  await api.get(resourceUrl, {params: queryParams})
  .then(function (apiResponse) {
    if (apiResponse.status != '200') {
      logResponse(apiResponse.data);
    }
    else {
      data = apiResponse.data;
    }
  })
  .catch(function (error) {
    logResponse(error);
    return error
  });
  return data;
}

async function postToApi(accessToken, resourceUrl, postParams = {}) {
  let data = null;
  let api = axios.create({
    baseURL: baseApiUri,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8"
    }
  });

  await api.post(resourceUrl, postParams)
  .then(function (apiResponse) {
    if (apiResponse.status != '200') {
      logResponse(apiResponse.data);
    }
    else {
      data = apiResponse.data;
      return data;
    }
  })
  .catch(function (error) {
    logResponse(error);
    return error;
  });
}

async function putToApi(accessToken, resourceUrl, postParams = {}) {
  let data = null;
  let api = axios.create({
    baseURL: baseApiUri,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8"
    }
  });

  await api.put(resourceUrl, postParams)
  .then(function (apiResponse) {
    if (apiResponse.status != '200') {
      logResponse(apiResponse.data);
    }
    else {
      data = apiResponse.data;
    }
  })
  .catch(function (error) {
    logResponse(error);
    return error;
  });
  return data;
}



async function getAccessToken(rksServiceAccount, privateKey, expires_ms=200) {
  const audienceString = `${baseApiUri}/identityserver/connect/token`;

  const assertion = {
    "iss": rksServiceAccount,
    "sub": rksServiceAccount,
    "aud": audienceString,
    "exp": Math.floor(new Date().getTime() / 1000) + expires_ms,
    "jti": uuidv4()
  };

  var signedAssertion;
  try {
    signedAssertion = jwt.sign(assertion, privateKey, { algorithm: 'RS256' });
  }
  catch(err) {
    console.log(`Error signing JWT. Check your private key. Error: ${err}`);
    return null;
  }

  const payload = {
    scope: "api",
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: signedAssertion
  };

  const tokenResponse = await makeAccessTokenRequest(payload);
  if (!tokenResponse || !tokenResponse.access_token) {
    return null;
  }
  return tokenResponse.access_token;
}


async function makeAccessTokenRequest(payload) {
  return axios.post(`${baseApiUri}/identityserver/connect/token`, querystring.stringify(payload))
  .then(function (response) {
    return response.data;
  })
  .catch(function (error) {
    console.log(error);
    return null;
  });
}

function logResponse(response) {
  console.log(util.inspect(response, { colors: true, depth: 3 }));
}

// Method which returns project device data.
async function getDeviceData(token, projectId, params) {
  //const participantResourceUrl = `/api/v1/administration/projects/` + rksProjectId + '/participants';
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/devicedatapoints'
  return await getFromApi(token, resourceUrl, params)
}

// Method which gets all the participants.
async function getAllParticipants(token, projectId) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/participants'
  return await getFromApi(token, resourceUrl)
}

// Method which will create a new task for the participant.
async function createTask(token, projectId, params) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/surveytasks'
  return await postToApi(token, resourceUrl, params)
}

// Method which updates the participants.
// The params must contain the participantIdentifier
function updateParticipant(token, projectId, params) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/participants'
  return putToApi(token, resourceUrl, params)
}

// Method which gets all the tasks for a given participant.
function getSurveyTasks(token, projectId, params) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/surveytasks'
  return getFromApi(token, resourceUrl, params)
}

// Method which closes a task.
function closeTask(token, projectId, taskId) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/surveytasks/'+taskId
  const params = {
    status: 'closed'
  }
  return putToApi(token, resourceUrl, params)
}

exports.getAccessToken = getAccessToken
exports.getFromApi = getFromApi
exports.postToApi = postToApi
exports.getDeviceData = getDeviceData
exports.getAllParticipants = getAllParticipants
exports.createTask = createTask
exports.putToApi = putToApi
exports.updateParticipant = updateParticipant
exports.getSurveyTasks = getSurveyTasks
exports.closeTask = closeTask
