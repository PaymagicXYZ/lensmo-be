import axios from 'axios';
import * as dotenv from 'dotenv'
import {getClaimableForUser} from "./data.js";
dotenv.config()

const paymagicBaseUrl = "https://paymagicapi.com/v1"
const paymagicHotSignerAddress = "0x2BB655A15c96776B5A8Fa75EFD22B2c030098FfF"
const walletExtraSignerAddress = "0x74427681c620DE258Aa53a382d6a4C865738A06C"

async function main() {
    const chain = 'matic'
    //const socialUser = "twitter:webmodularity"
    // Get claim wallet address for user
    //const claimable = await getClaimableForUser(socialUser);

    const claimSafeAddress = "0xf67461887C0dABBD78C02F88fb562F1df8Ee0B98";
    const newOwnerAddress = "0xFF94D9B276e5EA81BE66b51FdD06A1000254d92f";

    console.log(`Changing owner from ${paymagicHotSignerAddress} to ${newOwnerAddress} on safe at ${claimSafeAddress}`)
    const safeTransactionHash = await changeSafeOwnerTransaction(chain, claimSafeAddress, newOwnerAddress)
    if (safeTransactionHash) {
        console.log(`Successfully changed owner of safe. TxHash: ${safeTransactionHash}`)
        // TODO: Make changes in db onSuccess
    } else {
        console.log("Failed to change safe owner.")
    }

}

const changeSafeOwnerTransaction = async (
    chain: string,
    claimSafeAddress: string,
    newOwnerAddress: string
): Promise<string | undefined> => {
    const paymagicUrl = `${paymagicBaseUrl}/${chain}/account/${claimSafeAddress}/custom`

    const response = await axios.post(
        paymagicUrl,
        {
            "to": claimSafeAddress,
            "value": "0",
            "operation": 0,
            "data": buildClaimData(
                walletExtraSignerAddress,
                paymagicHotSignerAddress,
                newOwnerAddress
            )
        },
        {
            headers: {
                "x-api-key": process.env['PAYMAGIC_API_KEY'] as string
            }
        }
    )

    if (response.status === 200) {
        const paymagicTxId = response.data.id
        let attempts = 0;
        while (true) {
            attempts++;
            const txResponse = await paymagicTransactionStatus(chain, paymagicTxId)
            const status = txResponse.status
            if (status === 'COMPLETE') {
                return txResponse.currentHash
            } else if (status === 'FAILED' || attempts >= 30) {
                return undefined
            }
            await delay(1000)
        }
    }
}

const paymagicTransactionStatus = async (chain: string, txId: string): Promise<any> => {
    const url = `https://paymagicapi.com/v1/${chain}/tx/${txId}`

    const response = await axios.get(
        url,
        {
            headers: {
                "x-api-key": process.env['PAYMAGIC_API_KEY'] as string
            },
        }
    )

    return response.data
}

const delay = async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const buildClaimData = (prevAddress:string, oldAddress: string, newAddress: string): string => {
    return "0xe318b52b" +
        prevAddress.slice(2).padStart(64, "0") +
        oldAddress.slice(2).padStart(64, "0") +
        newAddress.slice(2).padStart(64, "0")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });