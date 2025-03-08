import { z } from 'zod'
import { Agent } from '@openserv-labs/sdk'
import { viem } from '@goat-sdk/wallet-viem';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import 'dotenv/config'

if (!process.env.WALLET_PRIVATE_KEY) {
  throw new Error('WALLET_PRIVATE_KEY is not set');
}

if (!process.env.RPC_PROVIDER_URL) {
  throw new Error('RPC_PROVIDER_URL is not set');
}

// Configure the wallet client
const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chain: mainnet,
});

const wallet = viem(walletClient);

// Create the agent
const agent = new Agent({
  systemPrompt: 'You are an agent that executes trades for the highest volume token using GOAT SDK'
})

// Add sum capability
agent.addCapability({
  name: 'execute_trade',
  description: 'Executes a small purchase of the highest-volume trending token from DexScreener',
  schema: z.object({
    tokenAddress: z.string().min(42, 'Invalid token address'),
    amount: z.number().min(0.001, 'Amount must be greater than 0.001 ETH')
  }),
  async run({ args }) {
    try {
      console.log(`📈 Executing trade: Buying ${args.amount} of token ${args.tokenAddress}`);

      // Simulate a trade execution using wallet client
      const tx = await wallet.sendTransaction({
        to: args.tokenAddress,
        value: parseEther(args.amount.toString()),
      });

      console.log(`🔄 Trade executed, transaction hash: ${tx.hash}`);

      // Check if the transaction was successful
      if (tx.status === "success") {
        console.log(`✅ Trade successful! TX: ${tx.hash}`);
        return {
          status: 'success',
          txHash: tx.hash,
        };
      } else {
        throw new Error('Trade transaction failed.');
      }
    } catch (error) {
      console.error("⚠️ Error executing trade:", error);
      return { error: error.message };
    }
  }
})

// Start the agent's HTTP server
agent.start()

async function main() {
  const execute_trade = await agent.process({
    messages: [
      {
        role: 'user',
        content: 'Execute trade for token at 0xTokenAddress with 0.1 ETH'
      }
    ]
  })

  console.log('Trade Execution Result:', execute_trade.choices[0].message.content)
}

main().catch(console.error)
