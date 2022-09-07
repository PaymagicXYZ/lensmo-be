import axios from 'axios';
import * as dotenv from 'dotenv'
dotenv.config()

const baseURL = "https://rvhpnxjvpgatvgaubbyt.supabase.co/rest/v1"

export const getClaimableResponseForUser = async (userId: string) => {
    const config = {
        params: {
            "user_id": userId as string
        },
        headers: {
            "apiKey": process.env['DATA_API_KEY'] as string
        },
        baseURL: baseURL
    }

    return await axios.get("Balances", config)
}