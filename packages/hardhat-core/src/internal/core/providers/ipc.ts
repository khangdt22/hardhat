import { EventEmitter } from "events";
import { IpcProvider as Web3IpcProvider } from "web3-providers-ipc";
import { timeout } from "@khangdt22/utils/promise";
import { JsonRpcRequest } from "../../util/jsonrpc";
import { EIP1193Provider, RequestArguments } from "../../../types";

const cache = new Map<string, Web3IpcProvider>();
let nextRequestId = 1;

export class IpcProvider extends EventEmitter implements EIP1193Provider {
  private readonly _provider: Web3IpcProvider;

  constructor(
    private readonly _path: string,
    private readonly _timeout = 20000
  ) {
    super();

    this._provider =
      cache.get(_path) ??
      new Web3IpcProvider(_path, {}, { autoReconnect: false });

    if (!cache.has(_path)) {
      cache.set(_path, this._provider);
    }
  }

  public get url(): string {
    return this._path;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const request = this._provider.request(
      this._getJsonRpcRequest(args.method, args.params as any[])
    );

    const response = await timeout(request, this._timeout);

    return response.result;
  }

  public async sendBatch(
    batch: Array<{ method: string; params: any[] }>
  ): Promise<any[]> {
    const request = this._provider.request(
      batch.map((b) => this._getJsonRpcRequest(b.method, b.params)) as any
    );

    const response = (await timeout(
      request,
      this._timeout
    )) as unknown as any[];

    return response.map((r) => r.result);
  }

  private _getJsonRpcRequest(
    method: string,
    params: any[] = []
  ): JsonRpcRequest & { jsonrpc: "2.0" } {
    return {
      jsonrpc: "2.0",
      method,
      params,
      id: nextRequestId++,
    };
  }
}
