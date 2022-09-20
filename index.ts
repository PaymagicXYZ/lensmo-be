import {
    getClaimableForUser,
    getTotalEscrowWalletCount,
    getClaimedEscrowWalletCount,
    addEscrowSafe
} from "./data";
import {createEscrowWallet} from "./safes.js";

const chain = "matic"
const targetEscrowWallets = 100;

// User claimable
// const testUser = "twitter:corbpage"
// const claimable = await getClaimableForUser(testUser)
// console.log(`Claimable for user (${testUser}): `, JSON.stringify(claimable, null, 4))

// Total escrow wallets
const totalEscrowWalletCount = await getTotalEscrowWalletCount()
console.log("Total escrow wallets: ", totalEscrowWalletCount)

// Claimed escrow wallets
const claimedEscrowWalletCount = await getClaimedEscrowWalletCount()
console.log("Claimed escrow wallets: ", claimedEscrowWalletCount)

const availableEscrowWallets = totalEscrowWalletCount - claimedEscrowWalletCount
//const newEscrowWalletsNeeded = targetEscrowWallets - availableEscrowWallets
const newEscrowWalletsNeeded = 19;
console.log("Escrow wallets needed: ", newEscrowWalletsNeeded)

let newSafesAdded = 0;
for (let i = 0;i < newEscrowWalletsNeeded;i++) {
    const newSafeAddress = await createEscrowWallet(chain)
    if (newSafeAddress) {
        console.log(`New escrow safe created on ${chain} with address: ${newSafeAddress}`)
        const addResponse = await addEscrowSafe(chain, newSafeAddress)
        if (addResponse.status === 201) {
            newSafesAdded++
            console.log("Safe added to escrow db")
        } else {
            console.log("Failed to add safe to escrow db")
        }
    } else {
        console.log("Failed to create escrow safe... moving on")
    }
}
console.log("New escrow wallets added: ", newSafesAdded)