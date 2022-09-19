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
    for (let i = 0;i < pendingWallets.length;i++) {
        const walletAddress = pendingWallets[i].receive_wallet_id.wallet_address
        const socialUser = pendingWallets[i].user_id
        // Checks if is any current native, erc20, or erc721 balance
        const walletEmpty = await walletIsEmpty(chain, walletAddress)
        console.log(`${i + 1}: ${walletAddress} is empty: ${walletEmpty}`)
        if (walletEmpty) {
            // Delete escrow_users row
            // Delete receive_wallet row
            // Re-insert receive_wallets.chain and receive_wallets.wallet_address
        } else {
            // Update receive_wallet.status=’assigned’ and receive_wallet.updated_at = now()
            // Mint SBT
            //const mintTxHash = mintToken(chain, socialUser, walletAddress)
            //console.log("Mint transaction hash: ", mintTxHash)
        }
    }
}

const getPendingWallets = async() => {
    let bufferUpdatedTime = new Date(Date.now() - 60 * 30 * 1000).toISOString();

    const config = {
        params: {
            "select": 'id,user_id,created_at,updated_at,receive_wallet_id(chain,wallet_address,wallet_type,status,created_at,updated_at)',
            "receive_wallet_id.status": 'eq.pending',
            "updated_at": `lt.${bufferUpdatedTime}`
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
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
    const mintTx = await mintContract.mint(walletAddress, socialUser)
    // Return here if we don't want to wait for tx to mine
    const receipt = await mintTx.wait()
    return receipt.transactionHash
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