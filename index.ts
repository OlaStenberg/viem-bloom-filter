import { isContractAddressInBloom, isTopicInBloom } from "ethereum-bloom-filters"
import { Address, createClient, http, multicall, watchBlocks } from "viem"
import { polygon } from 'viem/chains'
import { getReservesAbi, PAIRS, TOPIC } from "./config"


if (!process.env.ALCHEMY_ID) throw new Error('ALCHEMY_ID undefined')


const client = createClient({
    chain: polygon,
    transport: http(polygon.rpcUrls.alchemy.http + '/' + process.env.ALCHEMY_ID),
})

function setupBloomListener() {
    watchBlocks(client, {
        onBlock: (block) => {

            if (block.logsBloom !== null && isTopicInBloom(block.logsBloom, TOPIC)) {
                processBloom(block.number, block.logsBloom, block.hash)
            } else {
                console.log(`${block.number}~${block.hash} - TRUE NEGATIVE: Topic is not in bloom.`)
            }
        },
        onError: (err) => {
            console.error(err)
        },
        emitMissed: true,
    })
}

async function processBloom(blockNumber: bigint | null, bloom: string, hash: string | null): Promise<void> {
    if (!blockNumber || !hash) {
        console.warn('Block number or hash is null..?', blockNumber, hash)
        return
    }


    const pairsToUpdate = PAIRS.filter((c) => isContractAddressInBloom(bloom as Address, c))
    if (PAIRS.length === 0) {
        console.log(`${blockNumber}~${hash} - TRUE NEGATIVE: Pairs are not in bloom.`)
        return
    }

    const reserves = await multicall(client, {
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
        allowFailure: true,
        contracts: pairsToUpdate.map(
            (address) =>
            ({
                address: address as Address,
                chainId: 137,
                abi: getReservesAbi,
                functionName: 'getReserves',
            } as const)
        ),
    })

    console.log(`${blockNumber}~${hash} - Fetched reserves for ${reserves.length} pairs.`)

    // TODO: Save reserves.. currently no way of knowing if the multicall returns TP/FP
}


setupBloomListener()