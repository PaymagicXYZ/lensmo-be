import {ethers, providers} from "ethers";
import * as dotenv from 'dotenv'
import axios from "axios";
dotenv.config()

const supabaseBaseUrl = 'https://rvhpnxjvpgatvgaubbyt.supabase.co/rest/v1'
const covalentBaseUrl = 'https://api.covalenthq.com/v1'

type Chain = {
    name: string
    sbtContractAddress: string
    chainId: number
}

const chains: Chain[] = [
    {
        name: "matic",
        sbtContractAddress: "0x18D3c42F55b9b591351d8588fbE788244334adb4",
        chainId: 137
    }
]

async function main() {
    const chain = chains[0] // matic
    const pendingWallets = await getPendingWallets()
    let walletsReclaimed = 0
    let walletsAssigned = 0
    for (let i = 0;i < pendingWallets.length;i++) {
        const escrowUserId = pendingWallets[i].id
        const walletAddress = pendingWallets[i].receive_wallets.wallet_address
        const socialUser = pendingWallets[i].user_id
        // Checks if is any current native, erc20, or erc721 balance
        const walletEmpty = await walletIsEmpty(chain, walletAddress)
        console.log(`${i + 1}: ${walletAddress} is empty: ${walletEmpty}`)
        if (walletEmpty) {
            const removeUserResponse = await removeEscrowUser(escrowUserId) // status: 204
            const removeWalletResponse = await removeReceiveWallet(chain, walletAddress) // status: 204
            const insertWalletResponse = await insertReceiveWallet(chain, walletAddress) // status: 201
            walletsReclaimed++
        } else {
            const updateWalletResponse = await updateReceiveWallet(chain, walletAddress) // status: 200
            // Mint SBT
            const mintTxHash = await mintToken(chain, socialUser, walletAddress)
            console.log("Mint transaction hash: ", mintTxHash)
            walletsAssigned++
        }
    }
    console.log("Wallets reclaimed: ", walletsReclaimed)
    console.log("Wallets assigned: ", walletsAssigned)
}

const removeEscrowUser = async(id: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Authorization": 'Bearer ' + process.env['DATA_API_KEY'] as string
        },
        params: {
            "id": 'eq.' + id
        },
        baseURL: supabaseBaseUrl
    }

    return await axios.delete(
        "escrow_users",
        config
    )
}

const removeReceiveWallet = async(chain: Chain, walletAddress: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Authorization": 'Bearer ' + process.env['DATA_API_KEY'] as string
        },
        params: {
            "chain": 'eq.' + chain.name,
            "wallet_address": 'eq.' + walletAddress
        },
        baseURL: supabaseBaseUrl
    }

    return await axios.delete(
        "receive_wallets",
        config
    )
}

const insertReceiveWallet = async(chain: Chain, walletAddress: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Authorization": 'Bearer ' + process.env['DATA_API_KEY'] as string,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        baseURL: supabaseBaseUrl
    }

    return await axios.post(
        "receive_wallets",
        {
            "chain": chain.name,
            "wallet_address": walletAddress,
            "wallet_type": "safe",
            "status": "pending"
        },
        config
    )
}

const updateReceiveWallet = async(chain: Chain, walletAddress: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Authorization": 'Bearer ' + process.env['DATA_API_KEY'] as string,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        params: {
            "chain": 'eq.' + chain.name,
            "wallet_address": 'eq.' + walletAddress
        },
        baseURL: supabaseBaseUrl
    }

    return await axios.patch(
        "receive_wallets",
        {
            "status": "assigned",
            "updated_at": new Date().toISOString()
        },
        config
    )
}

const getPendingWallets = async() => {
    let bufferUpdatedTime = new Date(Date.now() - 60 * 30 * 1000).toISOString();

    const config = {
        params: {
            "select": 'id,user_id,created_at,updated_at,receive_wallets!inner(chain,wallet_address,wallet_type,status,created_at,updated_at)',
            "receive_wallets.status": 'eq.pending',
            "updated_at": `lt.${bufferUpdatedTime}`
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string,
            "Authorization": 'Bearer ' + process.env['DATA_API_KEY'] as string
        },
        baseURL: supabaseBaseUrl
    }

    const response = await axios.get("escrow_users", config)
    return response.data
}

const walletIsEmpty = async(chain: Chain, address: string): Promise<boolean> => {
    const config = {
        params: {
            "key": process.env['COVALENT_API_KEY'],
            "nft": "true",
            "no-nft-fetch": "true"
        },
        baseURL: covalentBaseUrl
    }
    const url = `${chain.chainId}/address/${address}/balances_v2/`
    const response = await axios.get(url, config)
    const items = response.data.data.items

    if (!items || items.length < 1) {
        return true
    } else {
        for (let i = 0;i < items.length;i++) {
            const itemBalance = parseInt(items[i].balance)
            if (itemBalance > 0) {
                return false
            }
        }
        return true
    }
}

const mintToken = async(chain: Chain, socialUser: string, walletAddress: string): Promise<string> => {
    const contractAddress = chain.sbtContractAddress
    const provider = await getProvider(chain)
    const signer = new ethers.Wallet(process.env['SIGNER_PK']!, provider)
    const mintContract = new ethers.Contract(contractAddress, sbtContractAbi, signer)
    const gasOptions = await getGasOptions(chain, provider)
    const mintTx = await mintContract.mint(walletAddress, socialUser, gasOptions)
    // Return here if we don't want to wait for tx to mine
    const receipt = await mintTx.wait()
    return receipt.transactionHash
}

const getGasOptions = async(chain: Chain, provider: providers.Provider): Promise<Object> => {
    if (chain.name === "matic") {
        const {data} = await axios({
            method: 'get',
            url: 'https://gasstation-mainnet.matic.network/v2'
        })
        return {
            "maxFeePerGas": ethers.utils.parseUnits(Math.ceil(data.fast.maxFee).toString(), 'gwei'),
            "maxPriorityFeePerGas": ethers.utils.parseUnits(Math.ceil(data.fast.maxPriorityFee).toString(), 'gwei')
        }
    } else {
        const feeData = await provider.getFeeData()
        const maxPriority = feeData.maxPriorityFeePerGas
        return {
            "maxPriorityFeePerGas": maxPriority,
            "maxFeePerGas": feeData.maxFeePerGas!.add(maxPriority!)
        }
    }
}

const getProvider = async(chain: Chain): Promise<providers.Provider> => {
    if (chain.name === "matic") {
        return new ethers.providers.AlchemyProvider(chain.name, process.env['ALCHEMY_ID'])
    } else {
        return new ethers.providers.InfuraProvider(chain.name, process.env['INFURA_ID'])
    }
}

const sbtContractAbi = [
    {
        "stateMutability": "nonpayable",
        "type": "function",
        "name": "mint",
        "inputs": [
            {
                "name": "recipient",
                "type": "address"
            },
            {
                "name": "name",
                "type": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    }
]

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });