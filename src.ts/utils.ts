import { solidityPackedKeccak256, Signer } from "ethers";
import PeerId from "peer-id";

export const VERSION = "1.0.0";

export async function fromPassword(signer: Signer, password: string) {
  let message = `Welcome to PintSwap!\n\nPintP2P v${VERSION}\n${solidityPackedKeccak256(["string"], [`/pintp2p/${VERSION}/` + password])}`;

  let seed = await signer.signMessage(message);
  // PeerId.createFromPrivKey((await cryptoFromSeed(seed)).bytes);
}
