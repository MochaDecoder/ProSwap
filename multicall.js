import { ethers } from 'ethers';

import V3SwapRouterABI from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json' assert { type: 'json' };
import PeripheryPaymentsABI from '@uniswap/v3-periphery/artifacts/contracts/interfaces/IPeripheryPayments.sol/IPeripheryPayments.json' assert { type: 'json' };
import MulticallABI from '@uniswap/v3-periphery/artifacts/contracts/interfaces/IMulticall.sol/IMulticall.json' assert { type: 'json' };
import ERC20ABI from './abi.json' assert { type: 'json' };

import * as dotenv from 'dotenv';
dotenv.config();

const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

const V3SwapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const WETHAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
const USDCAddress = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';
const UNIADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET);
const wallet = new ethers.Wallet(WALLET_SECRET);
const signer = wallet.connect(provider);

const swapRouterContract = new ethers.Contract(
    V3SwapRouterAddress,
    [...V3SwapRouterABI.abi, ...PeripheryPaymentsABI.abi, ...MulticallABI.abi],
    signer
);

async function main() {
    // ERC20 ABI
    let abi = [
        // Some details about the token
        'function name() view returns (string)',
        'function symbol() view returns (string)',

        // Get the account balance
        'function balanceOf(address) view returns (uint)',

        // Approve the spending of your token
        'function approve(address spender, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
    ];

    // Create a new contract instance with the contract address and the ABI
    let contract = new ethers.Contract(USDCAddress, abi, signer);
    let decimals = await contract.decimals();
    console.log(decimals);
    // Specify the amount to approve (in wei)
    let numberOfTokens = ethers.utils.parseUnits('100000.0', 6); // 100 tokens

    // Call the contract's approve function with the Uniswap router address and the amount
    let approveTx = await contract.approve(V3SwapRouterAddress, numberOfTokens);

    // Wait for the transaction to be mined
    let approveReceipt = await approveTx.wait();

    console.log('Approval Transaction Receipt: ', approveReceipt);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    const params1 = {
        tokenIn: USDCAddress,
        tokenOut: WETHAddress,
        fee: 10000,
        recipient: WALLET_ADDRESS,
        deadline: deadline,
        amountIn: ethers.utils.parseEther('0.001'),
        // amountIn: ethers.utils.parseUnits('100000.0', 6), // Adjust for USDC decimals
        // amountOutMinimum: ethers.utils.parseUnits('0.0001', 18), // Set a value greater than 0
        amountOutMinimum: 0, // Set a value greater than 0
        sqrtPriceLimitX96: 0,
    };

    const params2 = {
        tokenIn: WETHAddress,
        tokenOut: UNIADDRESS,
        fee: 10000,
        recipient: WALLET_ADDRESS,
        deadline: deadline,
        amountIn: ethers.utils.parseEther('0.001'),
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    const encData1 = swapRouterContract.interface.encodeFunctionData(
        'exactInputSingle',
        [params1]
    );

    const encData2 = swapRouterContract.interface.encodeFunctionData(
        'exactInputSingle',
        [params2]
    );

    const calls = [encData1];
    const encMultiCall = swapRouterContract.interface.encodeFunctionData(
        'multicall',
        [calls]
    );
    const gasPrice = ethers.utils.parseUnits('30', 'gwei');

    const txArgs = {
        to: V3SwapRouterAddress,
        from: WALLET_ADDRESS,
        data: encMultiCall,
        gasLimit: '4000000',
    };

    try {
        const gasEstimate =
            await swapRouterContract.estimateGas.exactInputSingle(params1);
        console.log('Estimated gas:', gasEstimate.toString());
    } catch (error) {
        console.log('Estimate gas error:', error);
    }

    try {
        const response = await swapRouterContract.callStatic.exactInputSingle(
            params1
        );
        console.log('Call response:', response);
    } catch (error) {
        console.log('Call error:', error);
    }

    const tx = await signer.sendTransaction(txArgs);
    console.log('tx', tx);

    const receipt = await tx.wait();
    console.log('🚀 ~ file: multicall.js:72 ~ main ~ receipt:', receipt);
}

main();
