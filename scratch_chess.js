import { Chess } from "chess.js";

const chess = new Chess();
console.log("start pos d2:", chess.get("d2"));

const fen = "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const chess2 = new Chess(fen);
console.log("fen d2:", chess2.get("d2"));

const piece = chess2.get("d2");
console.log("pieceColor before move:", piece?.color);

chess2.move({ from: "d2", to: "d4" });
console.log("pieceColor after move:", piece?.color);
