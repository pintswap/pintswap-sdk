import { solidityPackedKeccak256, Signer } from "ethers";
import PeerId from "peer-id";

export async function fromPassword(signer: Signer, password: string) {
  let message =
    "/pintp2p/1.0.0" +
    solidityPackedKeccak256(["string"], ["/pintp2p/1.0.0" + password]);

  let seed = await signer.signMessage(message);
  // PeerId.createFromPrivKey((await cryptoFromSeed(seed)).bytes);
}
