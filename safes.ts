import axios from 'axios';
import * as dotenv from 'dotenv'
dotenv.config()

const signerAddress = "0x74427681c620de258aa53a382d6a4c865738a06c"

export const createEscrowWallet = async (chain: string): Promise<string | undefined> => {
    const url = `https://paymagicapi.com/v1/${chain}/account`

    const response = await axios.post(
        url,
        {
            "signers": [signerAddress]
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
                return txResponse.safeAddress
            } else if (status === 'FAILED' || attempts >= 30) {
                break
            }
            await delay(1000)
        }
    }
    return undefined
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