import axios from "axios";
import * as dotenv from 'dotenv'
import {ethers} from "ethers";
dotenv.config()

const targetWalletCount = 100;

const supabaseBaseUrl = 'https://rvhpnxjvpgatvgaubbyt.supabase.co/rest/v1'
const paymagicBaseUrl = 'https://paymagicapi.com/v1'
const walletExtraSignerAddress = "0x74427681c620DE258Aa53a382d6a4C865738A06C"

async function main() {
    const chain = "matic"
    // Total escrow wallets
    const totalWalletCount = await getTotalReceiveWalletCount()
    console.log("Total n00b wallets: ", totalWalletCount)

    // Claimed escrow wallets
    const claimedWalletCount = await getClaimedReceiveWalletCount()
    console.log("Claimed n00b wallets: ", claimedWalletCount)

    const availableWalletCount = totalWalletCount - claimedWalletCount
    const newWalletsNeeded = targetWalletCount - availableWalletCount
    console.log("New n00b wallets needed: ", newWalletsNeeded)

    let newSafesAdded = 0;
    for (let i = 0;i < newWalletsNeeded;i++) {
        const newSafeAddress = await createEscrowWallet(chain)
        if (newSafeAddress) {
            console.log(`New safe created on ${chain} with address: ${newSafeAddress}`)
            const addResponse = await addReceiveWallet(chain, newSafeAddress)
            if (addResponse.status === 201) {
                newSafesAdded++
                console.log("Safe added!")
                // Remove extra owner
                const removeTxHash = await removeExtraOwner(chain, newSafeAddress)
                if (removeTxHash) {
                    console.log("Removed extra safe owner")
                } else {
                    console.log("Failed to remove extra safe owner")
                }
            } else {
                console.log("Failed to add safe!")
            }
        } else {
            console.log("Failed to create safe... moving on")
        }
    }
    console.log("New n00b wallets added: ", newSafesAdded)
}

const getTotalReceiveWalletCount = async(): Promise<number> => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Prefer": "count=exact"
        },
        baseURL: supabaseBaseUrl
    }

    const response = await axios.get("receive_wallets", config)
    const contentRangeSplit = response.headers['content-range'].split("/")
    return parseInt(contentRangeSplit[1])
}

const getClaimedReceiveWalletCount = async(): Promise<number> => {
    const config = {
        params: {
            "select": 'receive_wallets!inner(status)',
            "receive_wallets.status": 'eq.assigned'
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Prefer": "count=exact"
        },
        baseURL: supabaseBaseUrl
    }

    const response = await axios.get("escrow_users", config)
    const contentRangeSplit = response.headers['content-range'].split("/")
    return parseInt(contentRangeSplit[1])
}

export const addReceiveWallet = async(chain: string, safeAddress: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: supabaseBaseUrl,
        "Prefer": "resolution=merge-duplicates"
    }

    return await axios.post(
        "receive_wallets",
        {
            "chain": chain,
            "wallet_address": safeAddress,
            "wallet_type": "safe"
        },
        config
    )
}

const createEscrowWallet = async (chain: string): Promise<string | undefined> => {
    const url = `${paymagicBaseUrl}/${chain}/account`

    const response = await axios.post(
        url,
        {
            "signers": [walletExtraSignerAddress]
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

const removeExtraOwner = async(chain: string, safeAddress: string): Promise<string | undefined> => {
    const prevOwnerAddress = "0x0000000000000000000000000000000000000001"
    const iface = new ethers.utils.Interface(safeAbi)
    const removeOwnerTx = iface.encodeFunctionData("removeOwner", [prevOwnerAddress, walletExtraSignerAddress, 1])
    return await removeOwnerTransaction(chain, safeAddress, removeOwnerTx)
}

const removeOwnerTransaction = async (chain: string, safeAddress: string, data: string): Promise<string | undefined> => {
    const paymagicUrl = `${paymagicBaseUrl}/${chain}/account/${safeAddress}/custom`;
    const response = await axios.post(paymagicUrl, {
        "to": safeAddress,
        "value": "0",
        "operation": 0,
        "data": data
    }, {
        headers: {
            "x-api-key": process.env['PAYMAGIC_API_KEY'] as string
        }
    });
    if (response.status === 200) {
        const paymagicTxId = response.data.id;
        let attempts = 0;
        while (true) {
            attempts++;
            const txResponse = await paymagicTransactionStatus(chain, paymagicTxId);
            const status = txResponse.status;
            if (status === 'COMPLETE') {
                return txResponse.currentHash;
            }
            else if (status === 'FAILED' || attempts >= 30) {
                return undefined;
            }
            await delay(1000);
        }
    }
};

const paymagicTransactionStatus = async (chain: string, txId: string): Promise<any> => {
    const url = `${paymagicBaseUrl}/${chain}/tx/${txId}`

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

const safeAbi = [{"inputs":[{"internalType":"address","name":"prevOwner","type":"address"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"_threshold","type":"uint256"}],"name":"removeOwner","outputs":[],"stateMutability":"nonpayable","type":"function"}]

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });