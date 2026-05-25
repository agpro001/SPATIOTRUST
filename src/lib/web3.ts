import { BrowserProvider, JsonRpcSigner, toQuantity, hexlify, toUtf8Bytes } from "ethers";

export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "SepETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export type WalletKind = "metamask" | "walletconnect";

export type WalletState = {
  kind: WalletKind;
  address: string;
  chainId: string;
  provider: BrowserProvider;
  raw: any;
};

declare global {
  interface Window { ethereum?: any }
}

export function hasInjected(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectInjected(): Promise<WalletState> {
  if (!hasInjected()) throw new Error("No injected wallet (MetaMask) detected.");
  const eth = window.ethereum;
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  await ensureSepolia(eth);
  const provider = new BrowserProvider(eth);
  const net = await provider.getNetwork();
  return {
    kind: "metamask",
    address: accounts[0],
    chainId: toQuantity(net.chainId),
    provider,
    raw: eth,
  };
}

export async function connectWalletConnect(projectId: string): Promise<WalletState> {
  if (!projectId || projectId === "REPLACE_ME") {
    throw new Error("WalletConnect projectId not set. Open Settings to paste your free projectId from cloud.walletconnect.com.");
  }
  const mod: any = await import("@walletconnect/ethereum-provider");
  const EthereumProvider = mod.EthereumProvider ?? mod.default ?? mod;
  const wc = await EthereumProvider.init({
    projectId,
    chains: [11155111],
    showQrModal: true,
    metadata: {
      name: "SpatioTrust",
      description: "Decentralized Spatial Oracle Network",
      url: typeof window !== "undefined" ? window.location.origin : "https://spatiotrust.app",
      icons: [],
    },
  });
  await wc.connect();
  const provider = new BrowserProvider(wc as any);
  const accounts: string[] = await wc.request({ method: "eth_accounts" });
  const net = await provider.getNetwork();
  return {
    kind: "walletconnect",
    address: accounts[0],
    chainId: toQuantity(net.chainId),
    provider,
    raw: wc,
  };
}

async function ensureSepolia(eth: any) {
  try {
    const current = await eth.request({ method: "eth_chainId" });
    if (current?.toLowerCase() === SEPOLIA_CHAIN_ID_HEX) return;
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }] });
  } catch (err: any) {
    if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message ?? "")) {
      await eth.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
    } else {
      throw err;
    }
  }
}

/**
 * Publish a mock oracle proof — eth_sendTransaction with the zk hash as calldata.
 * Recipient is the user's own address; value is 0. This is intentionally a
 * harmless demo transaction so MetaMask opens without real bytecode deployment.
 */
export async function publishProof(wallet: WalletState, zkMockHash: string): Promise<string> {
  const signer: JsonRpcSigner = await wallet.provider.getSigner();
  // 4-byte dummy selector "0x5spO" → keccak("attest(bytes32)")[0..4] would be ideal,
  // we just synthesize a deterministic selector so it parses in explorers.
  const selector = "0xa11ce700";
  const cleanHash = zkMockHash.startsWith("0x") ? zkMockHash.slice(2) : zkMockHash;
  const data = selector + cleanHash.padEnd(64, "0");
  const tx = await signer.sendTransaction({
    to: wallet.address,
    value: 0n,
    data,
  });
  return tx.hash;
}

export function shortAddr(a?: string | null) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

// helpers re-exported in case consumers need them
export { hexlify, toUtf8Bytes };