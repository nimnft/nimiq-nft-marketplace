declare module "@nimiq/hub-api" {
  class HubApi {
    constructor(hubUrl: string);
    chooseAddress(opts: { appName: string }): Promise<{
      address: string;
      label: string;
    }>;
    checkout(opts: {
      appName: string;
      recipient: string;
      value: number;
      sender?: string;
      fee?: number;
      validityDuration?: number;
      extraData?: string | Uint8Array;
    }): Promise<{
      hash: string;
      serializedTx: string;
      raw: {
        signerPublicKey: Uint8Array;
        signature: Uint8Array;
        sender: string;
        senderType: number;
        recipient: string;
        recipientType: number;
        value: number;
        fee: number;
        validityStartHeight: number;
        extraData: Uint8Array;
        flags: number;
        networkId: number;
      };
    }>;
    signTransaction(opts: {
      appName: string;
      sender: string;
      recipient: string;
      value: number;
      validityStartHeight: number;
      fee?: number;
      extraData?: string | Uint8Array;
    }): Promise<{
      hash: string;
      serializedTx: string;
      raw: {
        signerPublicKey: Uint8Array;
        signature: Uint8Array;
        sender: string;
        senderType: number;
        recipient: string;
        recipientType: number;
        value: number;
        fee: number;
        validityStartHeight: number;
        extraData: Uint8Array;
        flags: number;
        networkId: number;
      };
    }>;
    signMessage(opts: {
      appName: string;
      message: string | Uint8Array;
      signer?: string;
    }): Promise<{
      signer: string;
      signerPublicKey: Uint8Array;
      signature: Uint8Array;
    }>;
    static MSG_PREFIX: string;
  }
  export default HubApi;
}
