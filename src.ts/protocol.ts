import protobuf from "protobufjs";
import api from "./pintswap-protocol.json";

const protocol = (protobuf.Root as any).fromJSON(api).nested.pintswap;

export { protocol };
