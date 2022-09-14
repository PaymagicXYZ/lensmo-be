import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import axios from "https://esm.sh/axios"

const paymagicBaseUrl = "https://paymagicapi.com/v1"
const paymagicHotSignerAddress = "0x2BB655A15c96776B5A8Fa75EFD22B2c030098FfF"
const walletExtraSignerAddress = "0x74427681c620DE258Aa53a382d6a4C865738A06C"

serve(async (req) => {
    const { newOwnerAddress } = await req.json()
    // Chain needs to be static, current DB design doesn't support multi chains
    const chain = 'matic'
    // Need to extract socialUser from logged-in user using JWT - hardcoded for now
    const socialUser = "twitter:corbpage"
    // Get claimSafeAddress from receive_wallets table based on socialUser - hardcoded for now
    const claimSafeAddress = "0x2fae3FBcEee7B8CbE1D153b879DD50ac70c92CD8"

    if (claimSafeAddress) {
        console.log(`Changing owner from ${paymagicHotSignerAddress} to ${newOwnerAddress} on safe at ${claimSafeAddress}`)
        const safeTransactionHash = await changeSafeOwnerTransaction(chain, claimSafeAddress, newOwnerAddress)
        if (safeTransactionHash) {
            console.log(`Successfully changed owner of safe. TxHash: ${safeTransactionHash}`)
            return new Response(
                JSON.stringify({"transactionHash": safeTransactionHash}),
                {
                    "status": 200,
                    "headers": { "Content-Type": "application/json" }
                }
            )
        }
    }

    return new Response(
        JSON.stringify({}),
        {
            "status": 500,
            "headers": { "Content-Type": "application/json" }
        }
    )
})

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
                "x-api-key": Deno.env.get('PAYMAGIC_API_KEY') as string
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
    const url = `${paymagicBaseUrl}/${chain}/tx/${txId}`

    const response = await axios.get(
        url,
        {
            headers: {
                "x-api-key": Deno.env.get('PAYMAGIC_API_KEY') as string
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
