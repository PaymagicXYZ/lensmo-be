import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import * as jose from "https://deno.land/x/jose/index.ts"

const paymagicHotSignerAddress = "0x2BB655A15c96776B5A8Fa75EFD22B2c030098FfF"

serve(async (req) => {
    const { newOwnerAddress } = await req.json()
    console.log(req)

    // Get user_id by decrypting the JWT from the header
    const user_id2 = await getUserIdFromReq(req)

    // Need to extract user_id from logged-in user using JWT - hardcoded for now
    const user_id = "twitter:corbpage"

    if (user_id) {

        // Chain needs to be static, current DB design doesn't support multi chains
        // const chain = 'matic'
        // Get claimSafeAddress from receive_wallets table based on socialUser
        // const claimSafeAddress = "0x2fae3FBcEee7B8CbE1D153b879DD50ac70c92CD8"
        const [chain, claimSafeAddress] = await getReceiveWalletForUserId(user_id)

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
    }

    return new Response(
        JSON.stringify({}),
        {
            "status": 400,
            "headers": { "Content-Type": "application/json" }
        }
    )
})

interface Headers {
    authorization: string;
  }

const getUserIdFromReq = async (
    req: any
): Promise<any | undefined> => {
    try {
        // Get JWT from Header: Authorization: Bearer <token>
        const authorization = req.headers.get('Authorization');
        // const jwt = authorization.replace('Bearer ', '')
        const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNjYzMjY2NTkwLCJzdWIiOiIwNjhlY2Y0NS1hN2U4LTRiOTgtYWUxNy1lZWNiMDcwNjc4M2UiLCJlbWFpbCI6Im1pa2UwMDA3MDhAbWUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnaXRodWIiLCJwcm92aWRlcnMiOlsiZ2l0aHViIiwiZGlzY29yZCJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9jZG4uZGlzY29yZGFwcC5jb20vYXZhdGFycy81NDQyNTE3NTk2Nzg0NTU4MTIvMzMzYjgxOWYxOTI2ZGM3YzhhMjM5NTQ0Y2NkOTdjMzUucG5nIiwiZW1haWwiOiJtaWtlMDAwNzA4QG1lLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJtaWtlbHhjIiwiaXNzIjoiaHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkiLCJuYW1lIjoibWlrZWx4YyM4OTk5IiwicGljdHVyZSI6Imh0dHBzOi8vY2RuLmRpc2NvcmRhcHAuY29tL2F2YXRhcnMvNTQ0MjUxNzU5Njc4NDU1ODEyLzMzM2I4MTlmMTkyNmRjN2M4YTIzOTU0NGNjZDk3YzM1LnBuZyIsInByZWZlcnJlZF91c2VybmFtZSI6Im1pa2VseGMiLCJwcm92aWRlcl9pZCI6IjU0NDI1MTc1OTY3ODQ1NTgxMiIsInN1YiI6IjU0NDI1MTc1OTY3ODQ1NTgxMiIsInVzZXJfbmFtZSI6Im1pa2VseGMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzZXNzaW9uX2lkIjoiM2RhMjBkYTMtYzQyYy00YmY3LTg5OTMtZTljMDhjNDZjYzBjIn0.eYbdZw2fTR3QZlk2XAVkBbZn-1uHNbeGLR0VkC0iCWc'

        console.log(authorization)
        console.log(jwt)
        // Decode JWT
        
        // let payload: string | Uint8Array;
        // let protectedHeader: Uint8Array | KeyLike;
        const verifyResult: any = await jose.jwtVerify(jwt, Deno.env.get('SUPABASE_JWT_SECRET') as KeyLike);
        console.log(verifyResult)        
        const decryptedResult: any = await jose.jwtDecrypt(jwt, Deno.env.get('SUPABASE_JWT_SECRET') as KeyLike);
        
        console.log(decryptedResult)
        // console.log(payload)
        
        
        // Get user_id from JWT (provider:username)



    } catch (error) {
        console.error(error);
        return null
    }
}

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
        return [null, null]
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
