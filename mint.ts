import { ethers } from "ethers";
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
    // Need to get these from request/DB
    const receiveAddress = "0x2fae3FBcEee7B8CbE1D153b879DD50ac70c92CD8"
    const socialUser = "twitter:corbpage"

    const contractAddress = "0x18D3c42F55b9b591351d8588fbE788244334adb4" // matic
    const provider = new ethers.providers.AlchemyProvider("matic", process.env['ALCHEMY_ID'])
    const signer = new ethers.Wallet(process.env['SIGNER_PK']!, provider)
    const mintContract = new ethers.Contract(contractAddress, contractAbi, signer)
    const mintTx = await mintContract.mint(receiveAddress, socialUser)
    // Return here if we don't want to wait for tx to mine
    const receipt = await mintTx.wait()
    const txHash = receipt.transactionHash
    console.log("Mint transaction hash: ", txHash)
}

const contractAbi = [
    {
        "name": "Mint",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": false
            },
            {
                "name": "name",
                "type": "string",
                "indexed": false
            }
        ],
        "anonymous": false,
        "type": "event"
    },
    {
        "name": "Invalidate",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": false
            }
        ],
        "anonymous": false,
        "type": "event"
    },
    {
        "stateMutability": "nonpayable",
        "type": "constructor",
        "inputs": [
            {
                "name": "name",
                "type": "string"
            },
            {
                "name": "symbol",
                "type": "string"
            },
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "outputs": []
    },
    {
        "stateMutability": "nonpayable",
        "type": "function",
        "name": "invalidate",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    },
    {
        "stateMutability": "nonpayable",
        "type": "function",
        "name": "setBaseTokenURI",
        "inputs": [
            {
                "name": "_baseTokenURI",
                "type": "string"
            }
        ],
        "outputs": []
    },
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
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "supportsInterface",
        "inputs": [
            {
                "name": "_interfaceID",
                "type": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "ownerOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "balanceOf",
        "inputs": [
            {
                "name": "owner",
                "type": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "hasValidToken",
        "inputs": [
            {
                "name": "owner",
                "type": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "issuerOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "isValid",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "tokenURI",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "tokenOfOwnerByIndex",
        "inputs": [
            {
                "name": "owner",
                "type": "address"
            },
            {
                "name": "index",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "total",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string"
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