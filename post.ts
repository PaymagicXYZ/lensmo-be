import { CREATE_POST_TYPED_DATA, PROFILE_ID } from "./constants";
import { apolloClient, createPostTypedData } from "./utils/apolloClient";
import { BigNumber, utils } from "ethers";
import {
  getAddressFromSigner,
  signedTypeData,
  splitSignature,
} from "./utils/ethers";
import { uploadIpfs } from "./utils/ipfs";
import { v4 as uuidv4 } from "uuid";
import { Metadata } from "./interfaces/publication";
import { login } from "./utils/auth";
import { lensHub } from "./utils/ethers";
import { pollUntilIndexed } from "./utils/indexer";
import {formTxString} from "./utils/helpers"

const recipient = "github:Corbin"
const sender = "twitter:@Rory"
const asset = "DAI";
const amount = 10;


async function main() {

const txString = formTxString(sender, recipient, asset, amount)

  const profileId = PROFILE_ID;
  if (!profileId) {
    throw new Error("Must define PROFILE_ID in the .env to run this");
  }
  const address = getAddressFromSigner();
  console.log("create post: address", address);
  await login(address);
  const ipfsResult = await uploadIpfs<Metadata>({
    version: "1.0.0",
    metadata_id: uuidv4(),
    description: "This is a transaction that occured on Lensmo",
    content: txString,
    external_url: null,
    image: null,
    imageMimeType: null,
    name: "Lensmo Transaction Details",
    attributes: [],
    media: [],
    appId: "Lensmo",
  });
  console.log("create post: ipfs result", ipfsResult);
  const createPostRequest = {
    profileId,
    contentURI: "ipfs://" + ipfsResult.path,
    collectModule: {
      // feeCollectModule: {
      //   amount: {
      //     currency: currencies.enabledModuleCurrencies.map(
      //       (c: any) => c.address
      //     )[0],
      //     value: '0.000001',
      //   },
      //   recipient: address,
      //   referralFee: 10.5,
      // },
      // revertCollectModule: true,
      freeCollectModule: { followerOnly: true },
      // limitedFeeCollectModule: {
      //   amount: {
      //     currency: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
      //     value: '2',
      //   },
      //   collectLimit: '20000',
      //   recipient: '0x3A5bd1E37b099aE3386D13947b6a90d97675e5e3',
      //   referralFee: 0,
      // },
    },
    referenceModule: {
      followerOnlyReferenceModule: false,
    },
  };
  const result = await createPostTypedData(createPostRequest);
  console.log("create post: createPostTypedData", result);
  const typedData = result.data.createPostTypedData.typedData;
  console.log("create post: typedData", typedData);
  const signature = await signedTypeData(
    typedData.domain,
    typedData.types,
    typedData.value
  );
  console.log("create post: signature", signature);
  const { v, r, s } = splitSignature(signature);
  const tx = await lensHub.postWithSig({
    profileId: typedData.value.profileId,
    contentURI: typedData.value.contentURI,
    collectModule: typedData.value.collectModule,
    collectModuleInitData: typedData.value.collectModuleInitData,
    referenceModule: typedData.value.referenceModule,
    referenceModuleInitData: typedData.value.referenceModuleInitData,
    sig: {
      v,
      r,
      s,
      deadline: typedData.value.deadline,
    },
  });
  console.log("create post: tx hash", tx.hash);
  console.log("create post: poll until indexed");
  const indexedResult = await pollUntilIndexed(tx.hash);
  console.log("create post: profile has been indexed", result);
  const logs = indexedResult.txReceipt.logs;
  console.log("create post: logs", logs);
  const topicId = utils.id(
    "PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)"
  );
  console.log("topicid we care about", topicId);
  const profileCreatedLog = logs.find((l: any) => l.topics[0] === topicId);
  console.log("create post: created log", profileCreatedLog);
  let profileCreatedEventLog = profileCreatedLog.topics;
  console.log("create post: created event logs", profileCreatedEventLog);
  const publicationId = utils.defaultAbiCoder.decode(
    ["uint256"],
    profileCreatedEventLog[2]
  )[0];
  console.log(
    "create post: contract publication id",
    BigNumber.from(publicationId).toHexString()
  );
  console.log(
    "create post: internal publication id",
    profileId + "-" + BigNumber.from(publicationId).toHexString()
  );
  return result.data;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
