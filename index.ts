import {getClaimableResponseForUser} from "./data.js";

const claimableResponse = await getClaimableResponseForUser("eq.twitter:corbpage")
console.log("Claimable response data: ", JSON.stringify(claimableResponse.data, null, 4))