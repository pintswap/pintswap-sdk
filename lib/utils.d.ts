export declare function handleKeygen({ stream }: {
    stream: any;
}): Promise<(string | import("@safeheron/two-party-ecdsa-js/dist/lib/keyGen/jsonObject").JsonObject.JsonObject_KeyShare2)[]>;
export declare function initKeygen(stream: any): Promise<(string | object)[]>;
