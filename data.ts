import axios from 'axios';
import * as dotenv from 'dotenv'
dotenv.config()

const baseURL = "https://rvhpnxjvpgatvgaubbyt.supabase.co/rest/v1"

export const getClaimableForUser = async (userId: string) => {
    const userMatch = "eq." + userId
    const config = {
        params: {
            "user_id": userMatch
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: baseURL
    }

    const response = await axios.get("Balances", config)
    return response.data
}

export const getTotalEscrowWalletCount = async() => {
    const config = {
        params: {
            "select": "id",
            "order": "id.desc",
            "limit": "1"
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: baseURL
    }

    const response = await axios.get("escrow_wallets", config)
    return response.data[0].id
}

export const getClaimedEscrowWalletCount = async() => {
    const config = {
        params: {
            "select": "escrow_wallet_id",
            "order": "escrow_wallet_id.desc",
            "limit": "1"
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: baseURL
    }

    const response = await axios.get("escrow_users", config)
    return response.data[0].escrow_wallet_id
}

export const addEscrowSafe = async(chain: string, safeAddress: string) => {
    const config = {
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: baseURL,
        "Prefer": "resolution=merge-duplicates"
    }

    const response = axios.post(
        "escrow_wallets",
        {
            "chain": chain,
            "wallet_address": safeAddress,
            "wallet_type": "safe"
        },
        config
    )
    return response
}