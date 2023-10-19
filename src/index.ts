import { createWallet, isEtherDeposit } from "@deroll/wallet";
import {
  Address,
  decodeAbiParameters,
  decodeFunctionData,
  getAddress,
  parseAbi,
  parseAbiParameters,
} from "viem";
import {
  AdvanceRequestData,
  AdvanceRequestHandler,
  RequestHandlerResult,
  createApp,
} from "@deroll/app";

// create application
const app = createApp({
  url: process.env.ROLLUP_HTTP_SERVER_URL ?? "http://127.0.0.1:5004",
});

const wallet = createWallet();
const DAPP_SHARDING_ADDRESS = "0x4753D5746881907764A789Dd67FD62e3573844Ea";

const abi = parseAbi([
  "function joinGame()",
  "function leaveLobby()",
  "function claimResult(bytes32 gameId, bytes1 winner)",
]);

const dappShardingHandler: AdvanceRequestHandler = async (
  data: AdvanceRequestData
) => {
  if (getAddress(data.metadata.msg_sender) === DAPP_SHARDING_ADDRESS) {
    const [verifierDApp, creator, templateHash, gameId] = decodeAbiParameters(
      parseAbiParameters(
        "address verifierDApp, address creator, bytes32 templateHash, bytes32 gameId"
      ),
      data.payload
    );
    return verificationStarted(verifierDApp, creator, templateHash, gameId);
  } else {
    return "reject";
  }
};

const verifierDappHandler: AdvanceRequestHandler = async (
  data: AdvanceRequestData
) => {
  //TODO: verify address
  const [winner] = decodeAbiParameters(
    parseAbiParameters("bytes1 winner"),
    data.payload
  );
  return handleVerificationResult(data.metadata.msg_sender, winner);
};

const mainHandler: AdvanceRequestHandler = async (data: AdvanceRequestData) => {
  const { functionName, args } = decodeFunctionData({
    abi,
    data: data.payload,
  });
  switch (functionName) {
    case "joinGame":
      return joinGame(data.metadata.msg_sender);
    case "leaveLobby":
      return leaveLobby(data.metadata.msg_sender);
    case "claimResult": {
      const [gameId, winner] = args;
      return claimResult(gameId, winner);
    }
  }
};

app.addAdvanceHandler(wallet.handler);
app.addAdvanceHandler(dappShardingHandler);
app.addAdvanceHandler(verifierDappHandler);
app.addAdvanceHandler(mainHandler);

// start app
app.start().catch((e) => {
  console.log(e);
  process.exit(1);
});

function joinGame(player: Address): RequestHandlerResult {
  // if player is already in the lobby, reject
  // if player doesn't have enough funds, reject
  // if there's enough players in the lobby, start a game
  //    remove oldest player from lobby
  //    create shard id
  //    create notice with both players address, shard id
  // else add him to lobby
  console.error("function not implemented.");
  return "reject";
}

//TODO:
function leaveLobby(player: Address): RequestHandlerResult {
  // if player not in lobby, reject
  // else remove player from lobby and unlock funds
  console.error("function not implemented.");
  return "reject";
}

//TODO: only accepts if the claim came from one of the players
function claimResult(gameId: string, winner: string): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

//TODO:
function verificationStarted(
  verifierDApp: Address,
  creator: Address,
  templateHash: string,
  gameId: string
): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

//TODO:
function handleVerificationResult(
  verifierDApp: Address,
  winner: string
): RequestHandlerResult {
  return "reject";
}
