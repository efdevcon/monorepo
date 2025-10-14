import { SuccessfulSignatureRes } from "@getpara/react-sdk";
import type { ParaWeb } from "@getpara/react-sdk";
import { hashMessage, hashTypedData } from "viem";
import type {
  AuthorizationRequest,
  SignAuthorizationReturnType,
  Hash,
  SignableMessage,
  TypedDataDefinition,
  TypedData,
} from "viem";
import { hashAuthorization } from "viem/utils";

const SIGNATURE_LENGTH = 130;
const V_OFFSET_FOR_ETHEREUM = 27;

function hexStringToBase64(hex: string): string {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = Buffer.from(cleanHex, "hex");
  return bytes.toString("base64");
}

function parseSignature(signature: string): { r: string; s: string; v: number } {
  const cleanSig = signature.startsWith("0x") ? signature.slice(2) : signature;

  if (cleanSig.length !== SIGNATURE_LENGTH) {
    throw new Error(`Invalid signature length: expected ${SIGNATURE_LENGTH} hex chars, got ${cleanSig.length}`);
  }

  const r = cleanSig.slice(0, 64);
  const s = cleanSig.slice(64, 128);
  const vHex = cleanSig.slice(128, 130);
  const v = parseInt(vHex, 16);

  if (isNaN(v)) {
    throw new Error(`Invalid v value in signature: ${vHex}`);
  }

  return { r, s, v };
}

async function signWithPara(para: ParaWeb, hash: Hash, adjustV: boolean = true): Promise<Hash> {
  const wallet = para.getWalletsByType("EVM")[0];
  if (!wallet) {
    throw new Error("Para wallet not available for signing");
  }

  const messagePayload = hash.startsWith("0x") ? hash.substring(2) : hash;
  const messageBase64 = hexStringToBase64(messagePayload);

  const response = await para.signMessage({
    walletId: wallet.id,
    messageBase64,
  });

  if (!("signature" in response)) {
    throw new Error(`Signature failed: ${JSON.stringify(response)}`);
  }

  let signature = (response as SuccessfulSignatureRes).signature;

  const { v } = parseSignature(signature);

  if (adjustV && v < 27) {
    const adjustedV = (v + V_OFFSET_FOR_ETHEREUM).toString(16).padStart(2, "0");
    signature = signature.slice(0, -2) + adjustedV;
  }

  return `0x${signature}`;
}

export async function customSignMessage(para: ParaWeb, message: SignableMessage): Promise<Hash> {
  const hashedMessage = hashMessage(message);
  return signWithPara(para, hashedMessage, true);
}

export async function customSignAuthorization(
  para: ParaWeb,
  authorization: AuthorizationRequest
): Promise<SignAuthorizationReturnType> {
  const address = (authorization.address || authorization.contractAddress) as `0x${string}`;
  if (!address) {
    throw new Error("Authorization must include address or contractAddress");
  }

  const authorizationHash = hashAuthorization({
    address,
    chainId: authorization.chainId,
    nonce: authorization.nonce,
  });

  const fullSignature = await signWithPara(para, authorizationHash, false);

  const { r, s, v } = parseSignature(fullSignature);

  if (v !== 0 && v !== 1) {
    throw new Error(`Invalid v value for EIP-7702: ${v}. Expected 0 or 1`);
  }

  return {
    address,
    chainId: Number(authorization.chainId),
    nonce: Number(authorization.nonce),
    r: `0x${r}`,
    s: `0x${s}`,
    yParity: v as 0 | 1,
    v: BigInt(v),
  };
}

export async function customSignTypedData<
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
>(para: ParaWeb, parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hash> {
  const typedDataHash = hashTypedData(parameters);
  return signWithPara(para, typedDataHash, true);
}

