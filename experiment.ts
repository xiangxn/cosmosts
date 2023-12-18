import config from "./config";
import { readFile } from "fs/promises"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"

const myAddress = "cosmos1k3lcascnnzt7wkgkx0wdurh7ezyf0y4fh82l84"
const PREFIX = "cosmos"

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
        prefix: PREFIX,
    })
}

const runAll = async (): Promise<void> => {
    console.log("RPC:", config.RPC)
    const client = await StargateClient.connect(config.RPC)
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())
    console.log(
        "Alice balances:",
        await client.getAllBalances(myAddress),
    )

    const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic()
    const alice = (await aliceSigner.getAccounts())[0].address
    console.log("Alice's address from signer", alice)

    const faucetTx: IndexedTx = (await client.getTx(
        "F6E569D9501852F037889188FEBA79A8730C0081018712E2859319E2A8BC7753",
    ))!
    console.log("Faucet Tx:", faucetTx)
    const decodedTx: Tx = Tx.decode(faucetTx.tx)
    console.log("DecodedTx:", decodedTx)
    console.log("Decoded messages:", decodedTx.body!.messages)
    const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
    console.log("Sent message:", sendMessage)
    let faucet: string = sendMessage.fromAddress
    faucet = "cosmos15gz6t0279dp4vldxcdrnklue0pvltl6h6pwuan"

    const signingClient = await SigningStargateClient.connectWithSigner(config.RPC, aliceSigner)
    console.log(
        "With signing client, chain id:",
        await signingClient.getChainId(),
        ", height:",
        await signingClient.getHeight()
    )
    console.log("Gas fee:", decodedTx.authInfo!.fee!.amount)
    console.log("Gas limit:", decodedTx.authInfo!.fee!.gasLimit.toString(10))

    const result = await signingClient.sendTokens(
        alice,
        faucet,
        [{ denom: "uatom", amount: "500" }],
        {
            amount: [{ denom: "uatom", amount: "1200" }],
            gas: "200000",
        },
    )
    // Output the result of the Tx
    console.log("Transfer result:", result)
}

runAll()