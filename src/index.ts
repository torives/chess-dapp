import { createWallet, isERC20Deposit } from "@deroll/wallet";
import { Address, decodeFunctionData, parseAbi } from "viem";
import { RequestHandlerResult, createApp } from "@deroll/app";

// create application
const app = createApp({
  url: process.env.ROLLUP_HTTP_SERVER_URL ?? "http://127.0.0.1:5004",
});

const wallet = createWallet();

// define application ABI
const abi = parseAbi([
  "function joinGame()",
  "function leaveLobby()",
  "function claimResult(address winner, uint256 shardId)",
  "function shardCreated(address shard, address creator, bytes32 templateHash, uint256 shardId)",
]);

// handle input encoded as ABI function call
app.addAdvanceHandler(async (input) => {
  if (isERC20Deposit(input)) {
    return wallet.handler(input);
  }
  try {
    const { functionName, args } = decodeFunctionData({
      abi,
      data: input.payload,
    });
    switch (functionName) {
      case "joinGame":
        return joinGame(input.metadata.msg_sender);
      case "leaveLobby":
        return leaveLobby(input.metadata.msg_sender);
      case "claimResult": {
        const [winner, shardId] = args;
        return claimResult(winner, shardId);
      }
      case "shardCreated": {
        const [shard, creator, templateHash, shardId] = args;
        return shardCreated(shard, creator, templateHash, shardId);
      }
    }
  } catch (error) {
    console.error(error);
    return "reject";
  }
});

function joinGame(player: Address): RequestHandlerResult {
  // if player is already in the lobby, reject
  // if player doesn't have enough funds, reject
  // lock new player funds
  // if there's enough players in the lobby, start a game
  //    remove oldest player from lobby
  //    create shard id
  //    create notice with both players address, shard id
  // else add him to lobby

  // if (lobby.includes(player)) {
  //   console.error(`player ${player} has already joined the lobby`);
  //   return "reject";
  // }
  console.error("function not implemented.");
  return "reject";
}

function leaveLobby(player: Address): RequestHandlerResult {
  // if player not in lobby, reject
  // else remove player from lobby and unlock funds
  console.error("function not implemented.");
  return "reject";
}

function claimResult(winner: string, shardId: bigint): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

function shardCreated(
  shard: string,
  creator: string,
  templateHash: string,
  shardId: bigint
): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

// start app
app.start().catch((e) => {
  console.log(e);
  process.exit(1);
});
