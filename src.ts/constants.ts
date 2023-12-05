import { PintP2P } from "./p2p";

export const SIGNAL_SERVER =
  "/dns4/p2p.diacetyl.is/tcp/443/wss/p2p-webrtc-star/";
// "/dns4/ns1.doublecup.dev/tcp/443/wss/p2p-webrtc-star/";
export const NAMESERVERS = {
  // DRIP: "pint1zgsfhgpxt9kmeyxl2lm08l9nr2233gcahzhyllrfre7k4ce9vjywrpqxv2kgc",
  DRIP: PintP2P.toAddress("QmTABj5y3Q7LPErKeEPyNHKakp4gAknfwFEAm6LsD6TaNT")
};
