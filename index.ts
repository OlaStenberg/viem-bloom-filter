import 'dotenv/config'
import { isContractAddressInBloom, isTopicInBloom } from "ethereum-bloom-filters"
import { Address, createClient, getBlockNumber, http, multicall, watchBlocks } from "viem"
import { polygon } from 'viem/chains'
import { getReservesAbi, PAIRS as PAIR_ADDRESSES, TOPIC } from "./config"
import { performance } from 'perf_hooks'

const ALCHEMY_ID = process.env['ALCHEMY_ID']

if (!ALCHEMY_ID) throw new Error('ALCHEMY_ID undefined')

let blocksProcessed = 0
let neededRpcsCalls = 0
let unnecessaryRpcCalls = 0

const PAIRS = new Map(PAIR_ADDRESSES.map(address => [address, { address, reserve0: BigInt(0), reserve1: BigInt(0), updatedAtBlock: BigInt(0) }]));

const client = createClient({
    chain: polygon,
    transport: http(polygon.rpcUrls.alchemy.http + '/' + ALCHEMY_ID),
})


async function main() {
    const blockNumber = await getBlockNumber(client)
    const reserves = await multicall(client, {
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
        allowFailure: true,
        contracts: Array.from(PAIRS.values()).map(
            (pair) =>
            ({
                address: pair.address as Address,
                chainId: 137,
                abi: getReservesAbi,
                functionName: 'getReserves',
            } as const)
        ),
    })
    Array.from(PAIRS.values()).forEach((pair, i) => {
        const res0 = reserves?.[i]?.result?.[0]
        const res1 = reserves?.[i]?.result?.[1]

        if (res0 && res1) {
            pair.reserve0 = res0
            pair.reserve1 = res1
            pair.updatedAtBlock = blockNumber
        }
    }
    )
    console.log(`Initalized reserves for ${PAIRS.size} pairs.`)

    setupBloomListener()
}

function setupBloomListener() {
    watchBlocks(client, {
        onBlock: (block) => {    
            blocksProcessed++
            if (blocksProcessed % 100 === 0) {
                console.log(`*** STATS: ${blocksProcessed} blocks processed, neededRpcsCalls: ${neededRpcsCalls}, unnecessaryRpcCalls: ${unnecessaryRpcCalls}.`)
            }

            if (block.logsBloom !== null && isTopicInBloom(block.logsBloom, TOPIC)) {
                processBloom(block.number, block.logsBloom, block.hash)
            } else {
                console.log(`${block.number}~${block.hash} - TN: Topic is not in bloom.`)
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

    const pairsToUpdate = Array.from(PAIRS.values()).filter((pair) => isContractAddressInBloom(bloom as Address, pair.address))
    if (pairsToUpdate.length === 0) {
        console.log(`${blockNumber}~${hash} - TN: Pairs are not in bloom.`)
        return
    }
    const startTime = performance.now()
    const reserves = await multicall(client, {
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
        allowFailure: true,
        contracts: pairsToUpdate.map(
            (pair) =>
            ({
                address: pair.address as Address,
                chainId: 137,
                abi: getReservesAbi,
                functionName: 'getReserves',
            } as const)
        ),
    })
    const endTime = performance.now()
    const duration = ((endTime - startTime) / 1000).toFixed(1)

    let updated = 0

    pairsToUpdate.forEach((pair, i) => {

        const res0 = reserves?.[i]?.result?.[0]
        const res1 = reserves?.[i]?.result?.[1]

        if (!res0 || !res1) return
        if (pair.reserve0 === res0 && pair.reserve1 === res1) return
        if (pair.updatedAtBlock > blockNumber) {
            console.debug(`Tried to update reserves for pair ${pair.address} at block ${blockNumber} but it was already updated at block ${pair.updatedAtBlock} (${duration}s). `)
            return
        }

        pair.reserve0 = res0
        pair.reserve1 = res1
        pair.updatedAtBlock = blockNumber
        updated++
    })
    if (updated === 0) {
        console.log(`${blockNumber}~${hash} - FP: Unnecessary call, ${pairsToUpdate.length} pairs (${duration}s).`)
        unnecessaryRpcCalls++
    }
    else {
        console.log(`${blockNumber}~${hash} - TP: Updated reserves for ${updated} pairs, ${pairsToUpdate.length - updated} was unnecessary (${duration}s). `)
        neededRpcsCalls++
    }
}


main()