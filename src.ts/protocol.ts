import protobuf from 'protobufjs';
import api = require('./pintswap-protocol.json');

const protocol = (protobuf.Root as any).fromJSON(api).nested.pintswap;

export { protocol }
