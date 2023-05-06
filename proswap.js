import { ethers } from 'ethers';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' assert { type: 'json' };
import SwapRouterABI from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json' assert { type: 'json' };
import { getPoolImmutables, getPoolState } from './helper.js';
import ERC20ABI from './abi.json' assert { type: 'json' };
import * as dotenv from 'dotenv';
dotenv.config();

const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET);
const poolAddress = '0x4D7C363DED4B3b4e1F954494d2Bc3955e49699cC'; // UNI/WETH
const swapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const input_token_name = 'Wrapped Ether';
const input_token_symbol = 'WETH';
const input_token_decimal = 18;
const input_token_address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const output_token_name = 'Uniswap Token';
const output_token_symbol = 'UNI';
const output_token_decimal = 18;
const output_token_address = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

async function main() {
    const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI.abi,
        provider
    );

    const immutables = await getPoolImmutables(poolContract);
    const state = await getPoolState(poolContract);

    const wallet = new ethers.Wallet(WALLET_SECRET);
    const connectedWallet = wallet.connect(provider);

    const swapRouterContract = new ethers.Contract(
        swapRouterAddress,
        SwapRouterABI.abi,
        provider
    );

    const inputAmount = 0.01;
    const amountIn = ethers.utils.parseUnits(
        inputAmount.toString(),
        input_token_decimal
    );

    const approvalAmount = (amountIn * 1000).toString();
    const tokenContract = new ethers.Contract(
        input_token_address,
        ERC20ABI,
        provider
    );
    const approvalResponse = await tokenContract
        .connect(connectedWallet)
        .approve(swapRouterAddress, approvalAmount);

    const params = {
        tokenIn: immutables.token1,
        tokenOut: immutables.token0,
        fee: immutables.fee,
        recipient: WALLET_ADDRESS,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    const t = swapRouterContract
        .connect(connectedWallet)
        .exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000),
        })
        .then(transaction => {
            console.log(transaction);
        })
        .catch(err => {
            console.log(err);
        });
}

main();
