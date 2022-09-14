import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

const paymagicHotSignerAddress = "0x2BB655A15c96776B5A8Fa75EFD22B2c030098FfF"

serve(async (req) => {
    const { newOwnerAddress } = await req.json()

    // Need to extract socialUser from logged-in user using JWT - hardcoded for now
    const socialUser = "twitter:corbpage"

    // Chain needs to be static, current DB design doesn't support multi chains
    // const chain = 'matic'
    // Get claimSafeAddress from receive_wallets table based on socialUser
    // const claimSafeAddress = "0x2fae3FBcEee7B8CbE1D153b879DD50ac70c92CD8"
    const [chain, claimSafeAddress] = await getReceiveWalletForUserId(socialUser)

    if (claimSafeAddress) {
        console.log(`Changing owner from ${paymagicHotSignerAddress} to ${newOwnerAddress} on safe at ${chain}:${claimSafeAddress}`)
        const paymagicResponse:any = await changeSafeOwnerTransaction(chain, claimSafeAddress, newOwnerAddress)
        console.log(`Paymagic call complete: `, paymagicResponse)

        if (paymagicResponse && paymagicResponse.status === 200) {
            return new Response(
                JSON.stringify(paymagicResponse),
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
            "status": 400,
            "headers": { "Content-Type": "application/json" }
        }
    )
})

const getReceiveWalletForUserId = async (
    user_id: string
): Promise<any | undefined> => {
    try {
        const url:string = `https://rvhpnxjvpgatvgaubbyt.supabase.co/rest/v1/escrow_users?select=id,user_id,created_at,updated_at,receive_wallet_id(chain,wallet_address,wallet_type,status,created_at,updated_at)&user_id=eq.${user_id}`
    
        let myHeaders = new Headers();
        myHeaders.append("apikey", Deno.env.get('SUPABASE_ANON_PUBLIC_API_KEY') as string);
    
        let requestOptions:object = {
            method: 'GET',
            headers: myHeaders
        };
    
        console.log(`Supabase Fetch: ${url} ${JSON.stringify(requestOptions)} }`)
        const response = await fetch(url, requestOptions)

        console.log(`Supabase call complete: `, response)
        const userData = await response.json()
        console.log(`User data: `, userData)
        const claimSafeAddress = userData[0]['receive_wallet_id']['wallet_address']
        const chain = userData[0]['receive_wallet_id']['chain']

        return [chain, claimSafeAddress]
    } catch (error) {
        console.error(error);
        return {status: 400}
    }
}

const changeSafeOwnerTransaction = async (
    chain: string,
    claimSafeAddress: string,
    newOwnerAddress: string
): Promise<any | undefined> => {
    try {
        const paymagicBaseUrl = "https://paymagicapi.com/v1"
        const walletExtraSignerAddress = "0x74427681c620DE258Aa53a382d6a4C865738A06C"
        const paymagicUrl:string = `${paymagicBaseUrl}/${chain}/account/${claimSafeAddress}/custom`
    
        let myHeaders = new Headers();
        myHeaders.append("X-API-KEY", Deno.env.get('PAYMAGIC_API_KEY') as string );
        myHeaders.append("Content-Type", "application/json" as string);
    
        let body:object = {
            "to": claimSafeAddress,
            "value": "0",
            "operation": 0,
            "data": buildClaimData(
                walletExtraSignerAddress,
                paymagicHotSignerAddress,
                newOwnerAddress
            )
        }
    
        let requestOptions:object = {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify(body)
        };
    
        console.log(`Paymagic Fetch: ${paymagicUrl} ${JSON.stringify(requestOptions)} }`)
        const response = await fetch(paymagicUrl, requestOptions)
    
        return response 

        } catch (error) {
            console.error(error);
            return {status: 400}
        }



    // Removing the check whether the tx goes through. We'll need to add this back in after the hackathon
    //
    // if (response.status === 200) {
    //     const paymagicTxId = response.data.id
    //     let attempts = 0;
    //     while (true) {
    //         attempts++;
    //         const txResponse = await paymagicTransactionStatus(chain, paymagicTxId)
    //         const status = txResponse.status
    //         if (status === 'COMPLETE') {
    //             return txResponse.currentHash
    //         } else if (status === 'FAILED' || attempts >= 30) {
    //             return undefined
    //         }
    //         await delay(1000)
    //     }
    // }
}

// Removing the check whether the tx goes through. We'll need to add this back in after the hackathon
//
// const paymagicTransactionStatus = async (chain: string, txId: string): Promise<any> => {
//     const url = `${paymagicBaseUrl}/${chain}/tx/${txId}`

//     const response = await axios.get(
//         url,
//         {
//             headers: {
//                 "x-api-key": Deno.env.get('PAYMAGIC_API_KEY') as string
//             },
//         }
//     )

//     return response.data
// }

// const delay = async (ms: number) => {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

const buildClaimData = (prevAddress:string, oldAddress: string, newAddress: string): string => {
    return "0xe318b52b" +
        prevAddress.slice(2).padStart(64, "0") +
        oldAddress.slice(2).padStart(64, "0") +
        newAddress.slice(2).padStart(64, "0")
}
