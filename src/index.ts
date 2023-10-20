import { createWallet, isEtherDeposit } from "@deroll/wallet";
import {
  Address,
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  getAddress,
  hexToBytes,
  keccak256,
  parseAbi,
  parseAbiParameters,
  parseGwei,
  toHex,
} from "viem";
import {
  AdvanceRequestData,
  AdvanceRequestHandler,
  RequestHandlerResult,
  createApp,
} from "@deroll/app";

interface Game {
  id: Hex;
  white: Address;
  black: Address;
  winner: Address | undefined;
  verifierDApp: Address | undefined;
  creator: Address | undefined;
  templateHash: Hex | undefined;
}

const app = createApp({
  url: process.env.ROLLUP_HTTP_SERVER_URL ?? "http://127.0.0.1:5004",
});

const wallet = createWallet();
const lobby = Array<Address>();
const games = new Map<Hex, Game>();
const GAME_MINIMUM_FUNDS = parseGwei("10");
const MIN_PLAYERS = 2;
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
      return joinGame(data.metadata.msg_sender, data.metadata.input_index);
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

function joinGame(player: Address, inputIndex: number): RequestHandlerResult {
  if (lobby.includes(player)) {
    console.error(`player ${player} already joined the lobby`);
    return "reject";
  }

  if (hasFundsToStartGame(player)) {
    console.error(`player ${player} doesn't have enough funds to join a game`);
    return "reject";
  }

  //TODO: lock funds

  if (lobby.length >= MIN_PLAYERS - 1) {
    const white = lobby.shift()!;
    const gameId = generateGameId(white, player, inputIndex);

    const payload = encodeAbiParameters(
      parseAbiParameters("bytes32 gameId, address white, address black"),
      [gameId, white, player]
    );

    games.set(gameId, {
      id: gameId,
      white: white,
      black: player,
      winner: undefined,
      verifierDApp: undefined,
      creator: undefined,
      templateHash: undefined,
    });

    app.createNotice({ payload });
  } else {
    lobby.push(player);
  }
  return "accept";
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

//TODO: should probably create a field/another type to know for each game if verification has started
// check how TurneBasedGameContext does this
// return error if verification has already started for game
// don't accept if game has already finished
function verificationStarted(
  verifierDApp: Address,
  creator: Address,
  templateHash: string,
  gameId: Hex
): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

//TODO: test this
function hasFundsToStartGame(player: Address): boolean {
  const balance = wallet.balanceOf(player);
  let gameCounter = 0;
  games.forEach((game, _) => {
    if (game.black === player || game.white === player) {
      gameCounter++;
    }
  });
  if (gameCounter > 0) {
    //FIXME: delegate locking logic to the wallet
    const amountLocked = BigInt(gameCounter) * GAME_MINIMUM_FUNDS;
    return balance >= amountLocked + GAME_MINIMUM_FUNDS;
  } else {
    return balance >= GAME_MINIMUM_FUNDS;
  }
}

//TODO:
function handleVerificationResult(
  verifierDApp: Address,
  winner: string
): RequestHandlerResult {
  return "reject";
}

function generateGameId(
  white: Address,
  black: Address,
  inputIndex: number
): Hex {
  const whiteB = hexToBytes(white);
  const blackB = hexToBytes(black);
  const indexB = Uint8Array.from([inputIndex]); //FIXME: convert this correctly

  const byteArray = new Uint8Array(
    whiteB.length + blackB.length + indexB.length
  );
  byteArray.set(whiteB, 0);
  byteArray.set(blackB, whiteB.length);
  byteArray.set(indexB, whiteB.length + blackB.length);

  return keccak256(byteArray);
}
