import {
  decodeAbiParameters,
  decodeFunctionData,
  getAddress,
  parseAbi,
  parseAbiParameters,
} from "viem";
import {
  AdvanceRequestData,
  AdvanceRequestHandler,
  createApp,
} from "@deroll/app";
import {
  claimResult,
  handleVerificationResult,
  joinGame,
  leaveLobby,
  verificationStarted,
  wallet,
} from "./app";

const app = createApp({
  url: process.env.ROLLUP_HTTP_SERVER_URL ?? "http://127.0.0.1:5004",
});

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
  try {
    const [winner] = decodeAbiParameters(
      parseAbiParameters("bytes1 winner"),
      data.payload
    );
    return handleVerificationResult(data.metadata.msg_sender, winner);
  } catch (error) {
    return "reject";
  }
};

const mainHandler: AdvanceRequestHandler = async (data: AdvanceRequestData) => {
  const { functionName, args } = decodeFunctionData({
    abi,
    data: data.payload,
  });
  switch (functionName) {
    case "joinGame":
      return joinGame(
        data.metadata.msg_sender,
        data.metadata.input_index,
        app.createNotice
      );
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
