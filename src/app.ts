import { RequestHandlerResult, Notice } from "@deroll/app";
import { createWallet } from "@deroll/wallet";
import {
  Address,
  Hex,
  encodeAbiParameters,
  hexToBytes,
  keccak256,
  parseAbiParameters,
  parseGwei,
} from "viem";

export const wallet = createWallet();
const lobby = Array<Address>();
const games = new Map<Hex, Game>();
const GAME_MINIMUM_FUNDS = parseGwei("10");
const MIN_PLAYERS = 2;

interface Game {
  id: Hex;
  white: Address;
  black: Address;
  winner: Address | undefined;
  verifierDApp: Address | undefined;
  creator: Address | undefined;
  templateHash: Hex | undefined;
}

export function joinGame(
  player: Address,
  inputIndex: number,
  createNotice: (request: Notice) => Promise<number>
): RequestHandlerResult {
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

    createNotice({ payload });
  } else {
    lobby.push(player);
  }
  return "accept";
}

//TODO:
export function leaveLobby(player: Address): RequestHandlerResult {
  // if player not in lobby, reject
  // else remove player from lobby and unlock funds
  console.error("function not implemented.");
  return "reject";
}

//TODO: only accepts if the claim came from one of the players
export function claimResult(
  gameId: string,
  winner: string
): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

//TODO: should probably create a field/another type to know for each game if verification has started
// check how TurneBasedGameContext does this
// return error if verification has already started for game
// don't accept if game has already finished
export function verificationStarted(
  verifierDApp: Address,
  creator: Address,
  templateHash: string,
  gameId: Hex
): RequestHandlerResult {
  console.error("function not implemented.");
  return "reject";
}

//TODO: test this
export function hasFundsToStartGame(player: Address): boolean {
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
export function handleVerificationResult(
  verifierDApp: Address,
  winner: string
): RequestHandlerResult {
  return "reject";
}

export function generateGameId(
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
