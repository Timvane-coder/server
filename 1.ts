const { BaileysClass } = require('../lib/baileys.js');
const { getYoutubeVideoInfo, getYoutubeMP4, getYoutubeMP3, getRelatedVideos } = require('../lib/youtube.js');
const { findUserRpg, editRpg } = require('../lib/schema.js');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const https = require('https');

const GraphingCalculatorGame = require('./graphingCalculatorGame.js'); 
const { ChessGame } = require('./ChessGame.js'); 


const botBaileys = new BaileysClass({});
botBaileys.on('auth_failure', async (error) => console.log("ERROR BOT: ", error));
botBaileys.on('qr', (qr) => console.log("NEW QR CODE: ", qr));
botBaileys.on('ready', async () => console.log('READY BOT'));

interface LeagueMatch {
    h_a: string;
    xG: string;
    xGA: string;
    npxG: string;
    npxGA: string;
    ppda: any;
    ppda_allowed: any;
    deep: string;
    deep_allowed: string;
    scored: string;
    missed: string;
    xpts: string;
    result: string;
    date: string;
    wins: string;
    draws: string;
    loses: string;
    pts: string;
    npxGD: string;
    [key: string]: any;
}

interface LeagueTeamData {
    teamName: string;
    matches: LeagueMatch[];
}

// Define TypeScript interfaces
interface MatchData {
    HomeTeam: string;
    AwayTeam: string;
    FTHG: string;
    FTAG: string;
    Date: string;
    Referee: string;
    HS: string;
    AS: string;
    HC: string;
    AC: string;
    HY: string;
    AY: string;
    HR: string;
    AR: string;
    [key: string]: string;
}

interface TeamStats {
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

interface UserSession {
    // YouTube session states
    awaitingYouTubeQuery: boolean;
    youtubeContext: any;
    awaitingYouTubeAction: boolean;
    awaitingRelatedSelection: boolean;

    // RPG session states
    awaitingGameAction: boolean;
    gameContext: any;

        // Chess session states
    awaitingChessMove: boolean;
    chessGame: any;
    isChessGameActive: boolean;

    // Graphing Calculator session states
    awaitingGraphInput: boolean;
    graphCalculator: any;
    isGraphCalculatorActive: boolean;

    // Multi-League session states
    awaitingEPLQuery: boolean;
    awaitingLaLigaQuery: boolean;
    awaitingSerieAQuery: boolean;
    currentLeague: string | null; // 'epl', 'laliga', 'seriea'
    leagueContext: any;

// Multi-League Analysis session states
    awaitingSerieAAnalysis: boolean;
    awaitingEPLAnalysis: boolean;
    awaitingLaLigaAnalysis: boolean;
    awaitingBundesligaAnalysis: boolean;
    awaitingLigue1Analysis: boolean;
    serieAContext: any;
    eplContext: any;
    laligaContext: any;
    bundesligaContext: any;
    ligue1Context: any;
    awaitingTeamSelection: boolean;
    awaitingAnalysisAction: boolean;
    

   // Session metadata
    lastActivity: number;
    sessionId: string;
    createdAt: number;
}



interface MaterialRequirement {
    [material: string]: number;
}

interface CraftingItem {
    id: number | boolean;
    material: MaterialRequirement;
    durability: number;
}

interface BlacksmithData {
    [category: string]: {
        [itemType: string]: CraftingItem;
    };
}



// League Data variables with proper typing
let eplData: MatchData[] = [];
let laligaData: MatchData[] = [];
let serieaData: MatchData[] = [];
let serieAAnalysisData: any[] = [];
let eplAnalysisData: any[] = [];
let laligaAnalysisData: any[] = [];
let bundesligaAnalysisData: any[] = [];
let ligue1AnalysisData: any[] = [];
let eplTeams: string[] = [];
let laligaTeams: string[] = [];
let serieaTeams: string[] = [];
let eplDataLoaded: boolean = false;
let laligaDataLoaded: boolean = false;
let serieaDataLoaded: boolean = false;
let serieAAnalysisDataLoaded: boolean = false;
let eplAnalysisDataLoaded: boolean = false;
let laligaAnalysisDataLoaded: boolean = false;
let bundesligaAnalysisDataLoaded: boolean = false;
let ligue1AnalysisDataLoaded: boolean = false;


// League URLs mapping
const LEAGUE_URLS = {
    epl: 'https://raw.githubusercontent.com/Timvane-coder/MySite-/main/epl.csv',
    seriea: 'https://raw.githubusercontent.com/Timvane-coder/MySite-/main/seriea.csv',
    laliga: 'https://raw.githubusercontent.com/Timvane-coder/MySite-/main/laliga.csv',
    bundesliga: 'https://raw.githubusercontent.com/Timvane-coder/MySite-/main/bundesliga.csv',
    ligue1: 'https://raw.githubusercontent.com/Timvane-coder/MySite-/main/ligue1.csv'
};

// Enhanced User session management with multi-league support
const userSessions = new Map<string, UserSession>();

const createUserSession = (phoneNumber: string): UserSession => {
    return {
        // YouTube session states
        awaitingYouTubeQuery: false,
        youtubeContext: null,
        awaitingYouTubeAction: false,
        awaitingRelatedSelection: false,

        // RPG session states
        awaitingGameAction: false,
        gameContext: null,

        // Chess session states
        awaitingChessMove: false,
        chessGame: null,
        isChessGameActive: false,

        // Graphing Calculator session states        
        awaitingGraphInput: false,
        graphCalculator: null,
        isGraphCalculatorActive: false,

        // Multi-League session states
        awaitingEPLQuery: false,
        awaitingLaLigaQuery: false,
        awaitingSerieAQuery: false,
        currentLeague: null, // 'epl', 'laliga', 'seriea'
        leagueContext: null,


        
        // Multi-League Analysis session states
        awaitingSerieAAnalysis: false,
        awaitingEPLAnalysis: false,
        awaitingLaLigaAnalysis: false,
        awaitingBundesligaAnalysis: false,
        awaitingLigue1Analysis: false,
        serieAContext: null,
        eplContext: null,
        laligaContext: null,
        bundesligaContext: null,
        ligue1Context: null,
        awaitingTeamSelection: false,
        awaitingAnalysisAction: false,

        // Session metadata
        lastActivity: Date.now(),
        sessionId: `${phoneNumber}_${Date.now()}`,
        createdAt: Date.now()
    };
};

const getUserSession = (phoneNumber: string): UserSession => {
    if (!userSessions.has(phoneNumber)) {
        userSessions.set(phoneNumber, createUserSession(phoneNumber));
        console.log(`📱 New session created for: ${phoneNumber.slice(-4)}`);
    }
    return userSessions.get(phoneNumber)!;
};

const resetUserSession = (phoneNumber: string): void => {
    const session = getUserSession(phoneNumber);

    // Clean up graphing calculator if active
    if (session.graphCalculator) {
        // Clean up any temporary graph files
        try {
            const graphDir = path.join(process.cwd(), 'linear_graphs');
            if (fs.existsSync(graphDir)) {
                // Optionally clean up user-specific graphs
                console.log('📊 Graphing calculator session cleaned up');
            }
        } catch (error) {
            console.log('Error cleaning up graph files:', error);
        }
    }

        // Clean up chess files if active
    if (session.chessGame) {
        session.chessGame.cleanupGameFiles();
    }

    // Reset Chess states
    session.awaitingChessMove = false;
    session.chessGame = null;
    session.isChessGameActive = false;   

    // Reset Graphing Calculator states
    session.awaitingGraphInput = false;
    session.graphCalculator = null;
    session.isGraphCalculatorActive = false;


    // Reset YouTube states
    session.awaitingYouTubeQuery = false;
    session.youtubeContext = null;
    session.awaitingYouTubeAction = false;
    session.awaitingRelatedSelection = false;

    // Reset RPG states
    session.awaitingGameAction = false;
    session.gameContext = null;

    

    // Reset League states
    session.awaitingEPLQuery = false;
    session.awaitingLaLigaQuery = false;
    session.awaitingSerieAQuery = false;
    session.currentLeague = null;
    session.leagueContext = null;

    
    // Reset all league analysis states
    session.awaitingSerieAAnalysis = false;
    session.awaitingEPLAnalysis = false;
    session.awaitingLaLigaAnalysis = false;
    session.awaitingBundesligaAnalysis = false;
    session.awaitingLigue1Analysis = false;
    session.serieAContext = null;
    session.eplContext = null;
    session.laligaContext = null;
    session.bundesligaContext = null;
    session.ligue1Context = null;
    session.awaitingTeamSelection = false;
    session.awaitingAnalysisAction = false;
    

    // Update activity
    session.lastActivity = Date.now();

    console.log(`🔄 Session reset for: ${phoneNumber.slice(-4)}`);
};



const createTempFilePath = (extension) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return path.join(process.cwd(), 'temp', `${timestamp}_${random}.${extension}`);
};

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const cleanupTempFile = (filePath) => {
    setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 5000);
};

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
};


const linearGraphsDir = path.join(process.cwd(), 'linear_graphs');
if (!fs.existsSync(linearGraphsDir)) {
    fs.mkdirSync(linearGraphsDir, { recursive: true });
}



const chessMainTempDir = path.join(tempDir, 'chess');
if (!fs.existsSync(chessMainTempDir)) {
    fs.mkdirSync(chessMainTempDir, { recursive: true });
}



// Enhanced chess game class for WhatsApp - Fixed version
class WhatsAppChessGame extends ChessGame {
    constructor(phoneNumber) {
        super();
        this.phoneNumber = phoneNumber;
        this.tempDir = path.join(process.cwd(), 'temp', 'chess', phoneNumber);
        this.moveHistory = []; // Store file paths for GIF creation
        this.currentBoardPath = null; // Track current board image path

        // Create user-specific temp directory for chess moves
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        console.log(`♟️ Chess game initialized for ${phoneNumber.slice(-4)}, temp dir: ${this.tempDir}`);
    }

    /**
     * Create initial board and save to temp
     */
    async initializeBoard() {
        try {
            await this.updateChessboard();
            const boardPath = await this.saveCurrentPosition();
            console.log(`🎯 Initial board created for ${this.phoneNumber.slice(-4)}: ${boardPath}`);
            return boardPath;
        } catch (error) {
            console.error("❌ Error initializing board:", error);
            return null;
        }
    }

    /**
     * Save current position to temp directory
     */
    async saveCurrentPosition() {
        try {
            const buffer = await this.chessboard.buffer("image/png", {
                highlight: true,
                coordinates: true
            });

            const moveCount = this.chess.history().length;
            const filename = `move_${String(moveCount).padStart(3, '0')}.png`;
            const filepath = path.join(this.tempDir, filename);

            await fsPromises.writeFile(filepath, buffer);
            
            // Store path for GIF creation
            this.moveHistory.push(filepath);
            this.currentBoardPath = filepath;
            
            console.log(`💾 Board saved for ${this.phoneNumber.slice(-4)}: ${filename}`);
            return filepath;
        } catch (error) {
            console.error("❌ Error saving position:", error);
            return null;
        }
    }

    /**
     * Get the current board image path
     */
    getCurrentBoardPath() {
        return this.currentBoardPath;
    }

    /**
     * Make player move and update board
     */
    async makePlayerMoveWithUpdate(from, to) {
        const moveResult = this.makePlayerMove(from, to);
        if (moveResult) {
            await this.updateChessboard();
            await this.saveCurrentPosition();
        }
        return moveResult;
    }

    /**
     * Make computer move and update board
     */
    async makeComputerMoveWithUpdate() {
        const moveResult = this.makeComputerMove();
        if (moveResult) {
            await this.updateChessboard();
            await this.saveCurrentPosition();
        }
        return moveResult;
    }

    /**
     * Create game GIF from all moves
     */
    async createGameGIF() {
        try {
            console.log(`🎬 Creating game GIF for ${this.phoneNumber.slice(-4)}...`);
            
            // Reset board to start position and replay all moves
            this.chessboard.loadPGN(this.chess.pgn());
            
            const buffer = await this.chessboard.buffer("image/gif", {
                delay: 1500,
                highlight: true,
                coordinates: true
            });

            const gifPath = path.join(this.tempDir, 'chess_game.gif');
            await fsPromises.writeFile(gifPath, buffer);
            
            console.log(`🎬 Game GIF created for ${this.phoneNumber.slice(-4)}: ${gifPath}`);
            return gifPath;
        } catch (error) {
            console.error("❌ Error creating GIF:", error);
            return null;
        }
    }

    /**
     * Get all possible moves for current position
     */
    getAllPossibleMoves() {
        return this.chess.moves({ verbose: true });
    }

    /**
     * Clean up temp files
     */
    cleanupGameFiles() {
        try {
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                files.forEach(file => {
                    const filePath = path.join(this.tempDir, file);
                    fs.unlinkSync(filePath);
                });
                
                // Remove directory if empty
                fs.rmdirSync(this.tempDir);
                console.log(`🧹 Cleaned up chess files for ${this.phoneNumber.slice(-4)}`);
            }
        } catch (error) {
            console.error("❌ Error cleaning up files:", error);
        }
    }
}

// Chess Helper Functions - Fixed version
const startChessGame = async (sender: string): Promise<void> => {
    try {
        const session = getUserSession(sender);

        // Reset other sessions and start chess
        resetUserSession(sender);
        
        session.chessGame = new WhatsAppChessGame(sender);
        session.awaitingChessMove = true;
        session.isChessGameActive = true;
        session.lastActivity = Date.now();

        // Generate and save initial board position
        const initialBoardPath = await session.chessGame.initializeBoard();

        // Send welcome message
        const welcomeMessage = '♟️ *Chess Game Started!*\n\n' +
            '🏳️ You are playing as *White*. Enter moves in any format:\n' +
            '   • a2-a3  (with dash)\n' +
            '   • a2 a3  (with space)\n' +
            '   • a2a3   (compact)\n\n' +
            '📖 Available commands:\n' +
            '• *moves* - See move examples\n' +
            '• *board* - Show current position\n' +
            '• *help* - Show all commands\n' +
            '• *history* - Show game history\n' +
            '• *status* - Show game status\n' +
            '• *quit* - Exit chess game\n\n' +
            '🎯 *White to move*\n' +
            'Enter your move:';

        await botBaileys.sendText(sender, welcomeMessage);
        console.log(`📤 Welcome message sent to ${sender.slice(-4)}`);

        // Send initial board image
        if (initialBoardPath && fs.existsSync(initialBoardPath)) {
            await botBaileys.sendMedia(sender, initialBoardPath, '♟️ Initial chess position');
            console.log(`📤 Initial board sent to ${sender.slice(-4)}`);
        } else {
            console.log(`❌ Initial board not found for ${sender.slice(-4)}: ${initialBoardPath}`);
        }
    } catch (error) {
        console.error(`❌ Error starting chess game for ${sender.slice(-4)}:`, error);
        await botBaileys.sendText(sender, '❌ Error starting chess game. Please try again.');
    }
};

const handleChessMove = async (sender: string, input: string): Promise<void> => {
    try {
        const session = getUserSession(sender);
        const inputStr = input.trim().toLowerCase();

        // Handle chess commands
        switch (inputStr) {
            case 'quit':
            case 'exit':
                await endChessGame(sender);
                return;

            case 'board':
                await sendCurrentBoard(sender);
                return;

            case 'moves':
                await sendAllMoves(sender);
                return;

            case 'help':
                await sendChessHelp(sender);
                return;

            case 'history':
                await sendGameHistory(sender);
                return;

            case 'status':
                await sendGameStatus(sender);
                return;
        }

        // Handle move input
        let from, to;

        // Parse different move formats
        if (inputStr.includes('-')) {
            [from, to] = inputStr.split('-');
        } else if (inputStr.includes(' ')) {
            [from, to] = inputStr.split(' ');
        } else if (inputStr.length === 4) {
            from = inputStr.substring(0, 2);
            to = inputStr.substring(2, 4);
        } else {
            const errorMessage = '❌ Invalid move format! Use one of these formats:\n' +
                '   • a2-a3  (with dash)\n' +
                '   • a2 a3  (with space)\n' +
                '   • a2a3   (no separator)\n\n' +
                '💡 Type *help* for all commands';
            
            await botBaileys.sendText(sender, errorMessage);
            console.log(`📤 Invalid format message sent to ${sender.slice(-4)}`);
            return;
        }

        if (!from || !to || from.length !== 2 || to.length !== 2) {
            const errorMessage = '❌ Invalid squares! Use format like: a2-a3, e2-e4, d1-h5\n' +
                '💡 Type *moves* to see all possible moves';
            
            await botBaileys.sendText(sender, errorMessage);
            console.log(`📤 Invalid squares message sent to ${sender.slice(-4)}`);
            return;
        }

        // Attempt to make player move
        const playerMoveSuccess = await session.chessGame.makePlayerMoveWithUpdate(from, to);
        
        if (playerMoveSuccess) {
            console.log(`✅ Player move successful: ${from}-${to} for ${sender.slice(-4)}`);
            
            // Send board after player move
            await sendCurrentBoard(sender);

            // Check if game is over
            if (session.chessGame.chess.isGameOver()) {
                await handleGameOver(sender);
                return;
            }

            // Computer makes its move
            const thinkingMessage = '🤖 Computer is thinking...';
            await botBaileys.sendText(sender, thinkingMessage);
            console.log(`📤 Thinking message sent to ${sender.slice(-4)}`);

            setTimeout(async () => {
                const computerMove = await session.chessGame.makeComputerMoveWithUpdate();
                if (computerMove) {
                    console.log(`✅ Computer move: ${computerMove.from}-${computerMove.to} for ${sender.slice(-4)}`);
                    
                    // Send board after computer move
                    await sendCurrentBoard(sender);

                    // Check if game is over after computer move
                    if (session.chessGame.chess.isGameOver()) {
                        await handleGameOver(sender);
                        return;
                    }

                    const statusMessage = `🎯 ${session.chessGame.getGameStatus()}\n` +
                        'Enter your next move:';
                    
                    await botBaileys.sendText(sender, statusMessage);
                    console.log(`📤 Status message sent to ${sender.slice(-4)}`);
                }
            }, 1500);

        } else {
            const invalidMoveMessage = '❌ Invalid move! Try again.\n' +
                '💡 Type *moves* to see move examples';
            
            await botBaileys.sendText(sender, invalidMoveMessage);
            console.log(`📤 Invalid move message sent to ${sender.slice(-4)}`);
        }
    } catch (error) {
        console.error(`❌ Error handling chess move for ${sender.slice(-4)}:`, error);
        await botBaileys.sendText(sender, '❌ Error processing move. Please try again.');
    }
};

const sendCurrentBoard = async (sender: string): Promise<void> => {
    try {
        const session = getUserSession(sender);
        const boardPath = session.chessGame.getCurrentBoardPath();

        console.log(`🎯 Sending board to ${sender.slice(-4)}, path: ${boardPath}`);

        if (boardPath && fs.existsSync(boardPath)) {
            const status = session.chessGame.getGameStatus();
            await botBaileys.sendMedia(sender, boardPath, `♟️ ${status}`);
            console.log(`📤 Board image sent to ${sender.slice(-4)}`);
        } else {
            console.log(`❌ Board image not found for ${sender.slice(-4)}: ${boardPath}`);
            await botBaileys.sendText(sender, '❌ Board image not found. Generating new board...');
            
            // Try to regenerate board
            await session.chessGame.updateChessboard();
            const newBoardPath = await session.chessGame.saveCurrentPosition();
            
            if (newBoardPath && fs.existsSync(newBoardPath)) {
                const status = session.chessGame.getGameStatus();
                await botBaileys.sendMedia(sender, newBoardPath, `♟️ ${status}`);
                console.log(`📤 Regenerated board sent to ${sender.slice(-4)}`);
            } else {
                await botBaileys.sendText(sender, '❌ Unable to generate board image. Please restart the game.');
            }
        }
    } catch (error) {
        console.error(`❌ Error sending board to ${sender.slice(-4)}:`, error);
        await botBaileys.sendText(sender, '❌ Error displaying board. Please try again.');
    }
};

const sendAllMoves = async (sender: string): Promise<void> => {
    try {
        const movesMessage = '📋 *CHESS MOVE EXAMPLES*\n\n' +
            '♟️ *PAWN MOVES:*\n' +
            '• e2-e4 → King\'s Pawn opening\n' +
            '• d2-d4 → Queen\'s Pawn opening\n' +
            '• c2-c4 → English Opening\n' +
            '• a2-a3 → Slow pawn advance\n\n' +
            '♞ *KNIGHT MOVES:*\n' +
            '• g1-f3 → Develop kingside knight\n' +
            '• b1-c3 → Develop queenside knight\n' +
            '• f3-e5 → Knight to center\n\n' +
            '♝ *BISHOP MOVES:*\n' +
            '• f1-c4 → Italian Game setup\n' +
            '• f1-b5 → Spanish Opening\n' +
            '• c1-f4 → Develop light bishop\n\n' +
            '♛ *QUEEN MOVES:*\n' +
            '• d1-h5 → Early queen attack\n' +
            '• d1-d2 → Queen development\n\n' +
            '♚ *KING MOVES & CASTLING:*\n' +
            '• e1-g1 → Castles kingside\n' +
            '• e1-c1 → Castles queenside\n' +
            '• e1-f1 → King move';

        await botBaileys.sendText(sender, movesMessage);
        console.log(`📤 Move examples sent to ${sender.slice(-4)}`);
    } catch (error) {
        console.error(`❌ Error sending moves to ${sender.slice(-4)}:`, error);
    }
};

const sendChessHelp = async (sender: string): Promise<void> => {
    try {
        const helpMessage = '🎮 *CHESS GAME COMMANDS*\n\n' +
            '📖 *moves* → Show move examples\n' +
            '♟️ *board* → Display current position\n' +
            '📜 *history* → Show game move history\n' +
            '🔄 *status* → Show current game status\n' +
            '❓ *help* → Show this help menu\n' +
            '🚪 *quit* → Exit the chess game\n\n' +
            '🎯 *To make a move:*\n' +
            'Use any format:\n' +
            '• a2-a3 (with dash)\n' +
            '• a2 a3 (with space)\n' +
            '• a2a3 (compact)\n\n' +
            '📝 *Special Moves:*\n' +
            '• Castling: e1-g1 (kingside)\n' +
            '• Castling: e1-c1 (queenside)\n' +
            '• En Passant: automatic if legal';

        await botBaileys.sendText(sender, helpMessage);
        console.log(`📤 Help message sent to ${sender.slice(-4)}`);
    } catch (error) {
        console.error(`❌ Error sending help to ${sender.slice(-4)}:`, error);
    }
};

const sendGameHistory = async (sender: string): Promise<void> => {
    try {
        const session = getUserSession(sender);
        const history = session.chessGame.gameHistory.join(' ');
        const moveCount = session.chessGame.chess.history().length;
        const pgn = session.chessGame.chess.pgn();

        const historyMessage = `📜 *Game History*\n\n` +
            `📈 Moves played: ${moveCount}\n` +
            `📝 PGN: ${pgn || 'No moves yet'}\n\n` +
            `🎯 ${session.chessGame.getGameStatus()}`;

        await botBaileys.sendText(sender, historyMessage);
        console.log(`📤 Game history sent to ${sender.slice(-4)}`);
    } catch (error) {
        console.error(`❌ Error sending history to ${sender.slice(-4)}:`, error);
    }
};

const sendGameStatus = async (sender: string): Promise<void> => {
    try {
        const session = getUserSession(sender);
        const moveCount = session.chessGame.chess.history().length;
        const currentTurn = session.chessGame.chess.turn() === 'w' ? 'White' : 'Black';
        const inCheck = session.chessGame.chess.inCheck() ? 'Yes' : 'No';

        const statusMessage = `📊 *Game Status*\n\n` +
            `🎯 ${session.chessGame.getGameStatus()}\n` +
            `📈 Moves played: ${moveCount}\n` +
            `⚪ Current turn: ${currentTurn}\n` +
            `⚠️ In check: ${inCheck}\n` +
            `🎮 Game active: ${session.isChessGameActive ? 'Yes' : 'No'}`;

        await botBaileys.sendText(sender, statusMessage);
        console.log(`📤 Game status sent to ${sender.slice(-4)}`);
    } catch (error) {
        console.error(`❌ Error sending status to ${sender.slice(-4)}:`, error);
    }
};

const handleGameOver = async (sender: string): Promise<void> => {
    try {
        const session = getUserSession(sender);
        let message = '🏁 *Game Over!*\n\n';

        if (session.chessGame.chess.isCheckmate()) {
            const winner = session.chessGame.chess.turn() === 'w' ? 'Black' : 'White';
            message += `👑 *Checkmate!* ${winner} wins!\n`;
        } else if (session.chessGame.chess.isDraw()) {
            if (session.chessGame.chess.isStalemate()) {
                message += '🤝 *Stalemate!* Draw!\n';
            } else if (session.chessGame.chess.isThreefoldRepetition()) {
                message += '🔄 *Threefold repetition!* Draw!\n';
            } else if (session.chessGame.chess.isInsufficientMaterial()) {
                message += '⚖️ *Insufficient material!* Draw!\n';
            } else {
                message += '🤝 *Draw!*\n';
            }
        }

        const pgn = session.chessGame.chess.pgn();
        message += `\n📜 Final PGN:\n${pgn}\n\n`;
        message += 'Creating game animation... 🎬';

        await botBaileys.sendText(sender, message);
        console.log(`📤 Game over message sent to ${sender.slice(-4)}`);

        // Create and send final game GIF
        try {
            const gifPath = await session.chessGame.createGameGIF();
            if (gifPath && fs.existsSync(gifPath)) {
                await botBaileys.sendMedia(sender, gifPath, '🎬 Complete game animation');
                console.log(`📤 Game GIF sent to ${sender.slice(-4)}`);
            }
        } catch (error) {
            console.error(`❌ Could not create game GIF for ${sender.slice(-4)}:`, error);
        }

        // Final message
        const finalMessage = 'Thanks for playing! Type *chess* to start a new game.';
        await botBaileys.sendText(sender, finalMessage);
        console.log(`📤 Final message sent to ${sender.slice(-4)}`);

        // Clean up and reset session
        await endChessGame(sender, false);
        
    } catch (error) {
        console.error(`❌ Error handling game over for ${sender.slice(-4)}:`, error);
    }
};

const endChessGame = async (sender: string, sendMessage: boolean = true): Promise<void> => {
    try {
        const session = getUserSession(sender);

        if (sendMessage) {
            await botBaileys.sendText(sender, '👋 Chess game ended. Thanks for playing!');
            console.log(`📤 End game message sent to ${sender.slice(-4)}`);
        }

        // Clean up files and reset session
        if (session.chessGame) {
            session.chessGame.cleanupGameFiles();
        }
        
        session.awaitingChessMove = false;
        session.chessGame = null;
        session.isChessGameActive = false;
        session.lastActivity = Date.now();

        console.log(`♟️ Chess game ended for ${sender.slice(-4)}`);
    } catch (error) {
        console.error(`❌ Error ending chess game for ${sender.slice(-4)}:`, error);
    }
};



// Graphing Calculator Functions
const startGraphingCalculator = async (sender: string): Promise<void> => {
    const session = getUserSession(sender);
    
    try {
        // Create new graphing calculator instance
        session.graphCalculator = new GraphingCalculatorGame();
        session.isGraphCalculatorActive = true;
        session.awaitingGraphInput = true;

        const welcomeMessage = 
            "📏 LINEAR FUNCTION CALCULATOR\n" +
            "========================================\n" +
            "🎯 Features:\n" +
            "  • Linear functions only (y = mx + c)\n" +
            "  • Individual graphs with coordinates\n" +
            "  • Slope and intercept analysis\n" +
            "  • Interactive command interface\n" +
            "========================================\n" +
            "📏 Starting Linear Function Calculator!\n" +
            "📈 Enter linear equations to plot them (y = mx + c format)\n" +
            "📊 Type 'formulas' to see all linear function examples\n" +
            "❓ Type 'help' for commands, 'quit' to exit\n\n" +
            "📏 Linear Calculator: 0 equations processed\n" +
            "📏 Enter linear equation or command:";

        await botBaileys.sendText(sender, welcomeMessage);
        
        console.log(`📊 Started graphing calculator for: ${sender.slice(-4)}`);
    } catch (error) {
        console.error('Error starting graphing calculator:', error);
        await botBaileys.sendText(sender, '❌ Error starting graphing calculator. Please try again.');
    }
};

const handleGraphingInput = async (sender: string, input: string): Promise<void> => {
    const session = getUserSession(sender);
    
    if (!session.graphCalculator || !session.isGraphCalculatorActive) {
        await botBaileys.sendText(sender, '❌ No active graphing calculator session. Type "graph" to start.');
        return;
    }

    try {
        const inputStr = input.trim().toLowerCase();
        const originalInput = input.trim();

        // Handle commands
        switch (inputStr) {
            case 'quit':
            case 'exit':
                session.awaitingGraphInput = false;
                session.isGraphCalculatorActive = false;
                session.graphCalculator = null;
                await botBaileys.sendText(sender, 
                    "👋 Thanks for using the Linear Function Calculator!\n" +
                    "📁 Your graphs were processed successfully."
                );
                return;

            case 'formulas':
                const formulasMessage = getFormulasMessage();
                await botBaileys.sendText(sender, formulasMessage);
                await sendGraphPrompt(sender, session);
                return;

            case 'help':
                const helpMessage = getHelpMessage();
                await botBaileys.sendText(sender, helpMessage);
                await sendGraphPrompt(sender, session);
                return;

            case 'history':
                const historyMessage = getHistoryMessage(session.graphCalculator);
                await botBaileys.sendText(sender, historyMessage);
                await sendGraphPrompt(sender, session);
                return;

            case 'save':
                await saveAndSendCurrentGraph(sender, session);
                await sendGraphPrompt(sender, session);
                return;

            case 'status':
                const statusMessage = getStatusMessage(session.graphCalculator);
                await botBaileys.sendText(sender, statusMessage);
                await sendGraphPrompt(sender, session);
                return;

            case 'clear':
                session.graphCalculator.calculator.clearEquations();
                session.graphCalculator.equationHistory = [];
                session.graphCalculator.equationCounter = 0;
                await botBaileys.sendText(sender, "🗑️ All linear equations cleared!");
                await sendGraphPrompt(sender, session);
                return;

            case 'undo':
                if (session.graphCalculator.equationCounter > 0) {
                    session.graphCalculator.equationHistory.pop();
                    session.graphCalculator.equationCounter = Math.max(0, session.graphCalculator.equationCounter - 1);
                    await botBaileys.sendText(sender, "⬅️ Last equation removed!");
                } else {
                    await botBaileys.sendText(sender, "❌ No equations to remove!");
                }
                await sendGraphPrompt(sender, session);
                return;
        }

        // Handle theme changes
        if (inputStr.startsWith('theme ')) {
            const themeArg = inputStr.split(' ')[1];
            const themeMessage = changeCalculatorTheme(session.graphCalculator, themeArg);
            await botBaileys.sendText(sender, themeMessage);
            await sendGraphPrompt(sender, session);
            return;
        }

        // Handle zoom changes
        if (inputStr.startsWith('zoom ')) {
            const zoomArgs = inputStr.split(' ').slice(1).map(parseFloat);
            if (zoomArgs.length === 4) {
                const zoomMessage = setCalculatorViewingWindow(session.graphCalculator, zoomArgs[0], zoomArgs[1], zoomArgs[2], zoomArgs[3]);
                await botBaileys.sendText(sender, zoomMessage);
            } else {
                await botBaileys.sendText(sender, "❌ Zoom format: zoom xmin xmax ymin ymax");
            }
            await sendGraphPrompt(sender, session);
            return;
        }

        // Handle equation input
        if (originalInput.length === 0) {
            await botBaileys.sendText(sender, "❌ Empty input! Enter a linear equation like 'y=2x+3'");
            await sendGraphPrompt(sender, session);
            return;
        }

        // Add y= prefix if missing and input contains x
        let equation = originalInput;
        if (!equation.toLowerCase().startsWith('y=') && equation.includes('x')) {
            equation = 'y=' + equation;
        }

        // Process the equation
        const result = await processGraphEquation(sender, session, equation);
        
        if (result.success) {
            // Send the analysis message
            await botBaileys.sendText(sender, result.message);
            
            // Send the graph image if available
            if (result.imagePath && fs.existsSync(result.imagePath)) {
                await botBaileys.sendImage(sender, result.imagePath);
                cleanupTempFile(result.imagePath);
            }
        } else {
            await botBaileys.sendText(sender, result.message);
        }

        await sendGraphPrompt(sender, session);

    } catch (error) {
        console.error('Error handling graphing input:', error);
        await botBaileys.sendText(sender, '❌ Error processing input. Please try again.');
        await sendGraphPrompt(sender, session);
    }
};

const processGraphEquation = async (sender: string, session: any, equation: string): Promise<{success: boolean; message: string; imagePath?: string | null}> => {
    try {
        // Check if it's a linear function
        if (!session.graphCalculator.isLinearFunction(equation)) {
            return {
                success: false,
                message: "❌ Only linear functions are supported!\n💡 Examples: y=2x+3, y=-x+1, y=0.5x-2"
            };
        }

        // Create a fresh calculator for this equation
        const testCalc = session.graphCalculator.createFreshCalculator();
        
        if (testCalc.addEquation(equation)) {
            session.graphCalculator.equationCounter++;
            session.graphCalculator.equationHistory.push(`${session.graphCalculator.equationCounter}. ${equation}`);

            // Generate the graph and analysis
            const analysisMessage = generateEquationAnalysis(session.graphCalculator, equation);
            const imagePath = await createAndSaveGraph(sender, session, equation, testCalc);

            return {
                success: true,
                message: analysisMessage,
                imagePath: imagePath
            };
        } else {
            return {
                success: false,
                message: "❌ Invalid linear equation!"
            };
        }
    } catch (error) {
        console.error('Error processing equation:', error);
        return {
            success: false,
            message: "❌ Error processing equation. Please try again."
        };
    }
};

const generateEquationAnalysis = (calculator: any, equation: string): string => {
    const description = calculator.getFormulaDescription(equation);
    const linearInfo = calculator.parseLinear(equation);
    
    let message = `\n📈 ${equation}: ${description}\n`;
    message += `Added linear equation: ${equation}\n\n`;
    
    if (linearInfo.isLinear) {
        const { slope, intercept } = linearInfo;
        
        message += `📊 Linear Function Analysis:\n`;
        message += `   Slope (m) = ${slope}\n`;
        message += `   Y-intercept (c) = ${intercept}\n`;

        if (slope === 0) {
            message += `   Type: Horizontal line\n`;
        } else if (slope > 0) {
            message += `   Type: Increasing line\n`;
        } else {
            message += `   Type: Decreasing line\n`;
        }

        message += `\n📍 Key Points:\n`;
        
        // Calculate key points
        const keyXValues = [-3, -2, -1, 0, 1, 2, 3];
        const xMin = calculator.calculator.xMin;
        const xMax = calculator.calculator.xMax;
        const yMin = calculator.calculator.yMin;
        const yMax = calculator.calculator.yMax;
        
        keyXValues.forEach(x => {
            const y = slope * x + intercept;
            if (y >= yMin && y <= yMax && x >= xMin && x <= xMax) {
                const marker = x === 0 ? ' ← Y-intercept' : '';
                message += `   (${x}, ${y})${marker}\n`;
            }
        });

        message += `\n🎯 Y-intercept: (0, ${intercept})\n`;

        // Show x-intercept if it exists and is reasonable
        if (slope !== 0) {
            const xIntercept = -intercept / slope;
            if (xIntercept >= xMin && xIntercept <= xMax) {
                message += `🎯 X-intercept: (${xIntercept.toFixed(2)}, 0)\n`;
            }
        }
    }

    return message;
};

const createAndSaveGraph = async (sender: string, session: any, equation: string, calculator: any): Promise<string | null> => {
    try {
        const userSpecificDir = path.join(linearGraphsDir, sender.replace(/[^a-zA-Z0-9]/g, '_'));
        if (!fs.existsSync(userSpecificDir)) {
            fs.mkdirSync(userSpecificDir, { recursive: true });
        }

        // Generate the graph buffer
        const buffer = await session.graphCalculator.createGraphWithPoints(equation, calculator);
        
        // Save to a temporary file for WhatsApp
        const tempPath = createTempFilePath('png');
        fs.writeFileSync(tempPath, buffer);

        // Also save to user directory for reference
        const filename = `linear_${String(session.graphCalculator.equationCounter).padStart(3, '0')}_${session.graphCalculator.sanitizeFilename(equation)}.png`;
        const permanentPath = path.join(userSpecificDir, filename);
        fs.writeFileSync(permanentPath, buffer);

        console.log(`💾 Linear graph saved: ${filename} for user: ${sender.slice(-4)}`);
        
        return tempPath;
    } catch (error) {
        console.error('Error creating graph:', error);
        return null;
    }
};

const saveAndSendCurrentGraph = async (sender: string, session: any): Promise<void> => {
    try {
        const buffer = await session.graphCalculator.calculator.buffer("image/png");
        const tempPath = createTempFilePath('png');
        fs.writeFileSync(tempPath, buffer);

        await botBaileys.sendText(sender, "💾 Current graph summary:");
        await botBaileys.sendImage(sender, tempPath);
        
        cleanupTempFile(tempPath);
        
        console.log(`💾 Summary graph sent to: ${sender.slice(-4)}`);
    } catch (error) {
        console.error('Error saving current graph:', error);
        await botBaileys.sendText(sender, "❌ Error saving current graph.");
    }
};

const sendGraphPrompt = async (sender: string, session: any): Promise<void> => {
    const status = `📏 Linear Calculator: ${session.graphCalculator.equationCounter} equations processed`;
    const prompt = `${status}\n📏 Enter linear equation or command:`;
    await botBaileys.sendText(sender, prompt);
};

const getFormulasMessage = (): string => {
    return "📏 LINEAR FUNCTIONS REFERENCE (y = mx + c)\n" +
           "========================================\n\n" +
           "📈 AVAILABLE LINEAR FUNCTIONS:\n" +
           "y=2x+3        → Linear function: slope = 2, y-intercept = 3\n" +
           "y=x+1         → Linear function: slope = 1, y-intercept = 1\n" +
           "y=-x+5        → Linear function: slope = -1, y-intercept = 5\n" +
           "y=0.5x-2      → Linear function: slope = 0.5, y-intercept = -2\n" +
           "y=3x          → Linear function through origin: slope = 3\n" +
           "y=-2x+1       → Linear function: slope = -2, y-intercept = 1\n" +
           "y=x           → Identity function: slope = 1, y-intercept = 0\n" +
           "y=-x          → Negative identity function: slope = -1, y-intercept = 0\n" +
           "y=4           → Horizontal line: y = 4\n" +
           "y=-3          → Horizontal line: y = -3\n" +
           "y=1.5x+2      → Linear function: slope = 1.5, y-intercept = 2\n" +
           "y=-0.5x-1     → Linear function: slope = -0.5, y-intercept = -1\n\n" +
           "📝 LINEAR EQUATION INPUT EXAMPLES:\n" +
           "• Positive slope:    y=2x+3, y=x+1, y=3x\n" +
           "• Negative slope:    y=-x+5, y=-2x+1\n" +
           "• Decimal slope:     y=0.5x-2, y=1.5x+2\n" +
           "• Horizontal lines:  y=4, y=-3\n" +
           "• Through origin:    y=x, y=-x, y=3x\n\n" +
           "🎯 Each equation creates its own graph with coordinate points!";
};

const getHelpMessage = (): string => {
    return "📏 LINEAR FUNCTION CALCULATOR COMMANDS\n" +
           "========================================\n" +
           "📊 formulas → Show all linear function examples\n" +
           "📜 history  → Show equation history\n" +
           "💾 save     → Save current graph as image\n" +
           "🔄 status   → Show calculator status\n" +
           "🎨 theme    → Change theme (standard/dark/scientific)\n" +
           "📏 zoom     → Adjust window (xmin xmax ymin ymax)\n" +
           "🗑️ clear    → Clear all equations\n" +
           "⬅️ undo     → Remove last equation\n" +
           "❓ help     → Show this help menu\n" +
           "🚪 quit     → Exit calculator\n" +
           "========================================\n" +
           "📏 To add linear equation: 'y=2x+3', 'y=-x+1', 'y=0.5x-2'\n" +
           "📍 Coordinate points automatically marked";
};

const getHistoryMessage = (calculator: any): string => {
    let message = "\n📜 Linear Equation History:\n";
    if (calculator.equationHistory.length === 0) {
        message += "  No equations added yet.";
    } else {
        calculator.equationHistory.forEach(eq => {
            message += `  ${eq}\n`;
        });
    }
    return message;
};

const getStatusMessage = (calculator: any): string => {
    return `\n📊 Calculator Status:\n` +
           `📈 Linear equations: ${calculator.equationCounter}\n` +
           `🎨 Theme: ${calculator.calculator.theme}\n` +
           `📏 Window: x[${calculator.calculator.xMin}, ${calculator.calculator.xMax}], y[${calculator.calculator.yMin}, ${calculator.calculator.yMax}]`;
};

const changeCalculatorTheme = (calculator: any, theme: string): string => {
    switch (theme.toLowerCase()) {
        case 'standard':
            calculator.calculator.setTheme(calculator.calculator.constructor.Theme?.Standard || 'standard');
            return "🎨 Theme: Standard";
        case 'dark':
            calculator.calculator.setTheme(calculator.calculator.constructor.Theme?.Dark || 'dark');
            return "🎨 Theme: Dark";
        case 'scientific':
            calculator.calculator.setTheme(calculator.calculator.constructor.Theme?.Scientific || 'scientific');
            return "🎨 Theme: Scientific";
        default:
            return "❌ Invalid theme! Use: standard, dark, scientific";
    }
};

const setCalculatorViewingWindow = (calculator: any, xMin: number, xMax: number, yMin: number, yMax: number): string => {
    if (xMin >= xMax || yMin >= yMax) {
        return "❌ Invalid window! Min < Max required";
    }
    
    calculator.calculator.xMin = xMin;
    calculator.calculator.xMax = xMax;
    calculator.calculator.yMin = yMin;
    calculator.calculator.yMax = yMax;

    return `📏 Window: x[${xMin}, ${xMax}], y[${yMin}, ${yMax}]`;
};



const isNumber = (x) => typeof x === 'number' && !isNaN(x) && isFinite(x);

// Game Data Constants
const blacksmith: BlacksmithData = {
    createsword: {
        wooden: { id: 1, material: { wood: 10, string: 4 }, durability: 60 },
        stone: { id: 2, material: { wood: 5, rock: 7, string: 4 }, durability: 90 },
        iron: { id: 3, material: { wood: 5, iron: 7, string: 4 }, durability: 125 },
        gold: { id: 4, material: { wood: 5, string: 4, gold: 7 }, durability: 150 },
        diamond: { id: 6, material: { wood: 5, string: 4, diamond: 7 }, durability: 200 },
        emerald: { id: 7, material: { wood: 5, string: 4, emerald: 7 }, durability: 175 },
    },
    createarmor: {
        wooden: { id: 1, material: { wood: 10, string: 4 }, durability: 60 },
        stone: { id: 2, material: { wood: 5, rock: 7, string: 4 }, durability: 90 },
        iron: { id: 3, material: { wood: 5, iron: 7, string: 4 }, durability: 125 },
        gold: { id: 4, material: { wood: 5, string: 4, gold: 7 }, durability: 150 },
        diamond: { id: 6, material: { wood: 5, string: 4, diamond: 7 }, durability: 200 },
        emerald: { id: 7, material: { wood: 5, string: 4, emerald: 7 }, durability: 175 },
    },
    createpickaxe: {
        wooden: { id: 1, material: { wood: 10, string: 4 }, durability: 60 },
        stone: { id: 2, material: { wood: 5, rock: 7, string: 4 }, durability: 90 },
        iron: { id: 3, material: { wood: 5, iron: 7, string: 4 }, durability: 125 },
        gold: { id: 4, material: { wood: 5, string: 4, gold: 7 }, durability: 150 },
        diamond: { id: 6, material: { wood: 5, string: 4, diamond: 7 }, durability: 200 },
        emerald: { id: 7, material: { wood: 5, string: 4, emerald: 7 }, durability: 175 },
    },
    createfishingrod: {
        fishingrod: { id: true, material: { wood: 10, string: 15 }, durability: 150 },
    },
};

const shopItems = {
    buy: {
        limit: { exp: 999 },
        potion: { money: 1250 },
        trash: { money: 4 },
        common: { money: 10000 },
        uncommon: { money: 25000 },
        mythic: { money: 50000 },
        legendary: { money: 100000 },
    },
    sell: {
        potion: { money: 625 },
        trash: { money: 4 },
        wood: { money: 50 },
        rock: { money: 75 },
        string: { money: 60 },
        iron: { money: 150 },
        gold: { money: 300 },
        diamond: { money: 500 },
        emerald: { money: 400 },
    },
};

const crateRewards = {
    common: {
        money: 101, exp: 201, trash: 11,
        potion: [0, 1, 0, 1, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        wood: [1, 2, 3, 1, 2, 0, 1],
        rock: [1, 2, 1, 2, 0, 1, 1],
        string: [1, 2, 1, 1, 2, 0, 1],
    },
    uncommon: {
        money: 201, exp: 401, trash: 31,
        potion: [0, 1, 0, 0, 0, 0, 0],
        diamond: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 0, 0, 0, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        mythic: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        wood: [0, 1, 2, 3, 2, 1],
        rock: [0, 1, 2, 3, 2, 1],
        string: [0, 1, 2, 3, 2, 1],
        iron: [0, 1, 0, 0, 1, 0],
    },
    mythic: {
        money: 301, exp: 551, trash: 61,
        potion: [0, 1, 0, 0, 0, 0],
        emerald: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        diamond: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        gold: [0, 1, 0, 0, 0, 0, 0, 0, 0],
        iron: [0, 1, 0, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 0, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 0],
        mythic: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        legendary: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        pet: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        wood: [1, 2, 3, 4, 2],
        rock: [1, 2, 3, 4, 2],
        string: [1, 2, 3, 4, 2],
    },
    legendary: {
        money: 401, exp: 601, trash: 101,
        potion: [0, 1, 2, 1, 0],
        emerald: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        diamond: [0, 1, 0, 0, 0, 0, 0, 0, 0],
        gold: [0, 1, 0, 0, 0, 0, 0, 0],
        iron: [0, 1, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0],
        mythic: [0, 1, 0, 0, 0, 0, 0, 0, 0],
        legendary: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        pet: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        wood: [2, 3, 4, 5, 3],
        rock: [2, 3, 4, 5, 3],
        string: [2, 3, 4, 5, 3],
    },
    pet: { pet: 5 },
};

const inventoryDisplay = {
    others: { health: true, money: true, exp: true, level: true, energy: true },
    items: {
        potion: true, trash: true, wood: true, rock: true, string: true,
        emerald: true, diamond: true, gold: true, iron: true,
    },
    tools: {
        armor: {
            '0': '❌', '1': 'Wooden Armor', '2': 'Stone Armor',
            '3': 'Iron Armor', '4': 'Gold Armor', '6': 'Diamond Armor', '7': 'Emerald Armor',
        },
        sword: {
            '0': '❌', '1': 'Wooden Sword', '2': 'Stone Sword',
            '3': 'Iron Sword', '4': 'Gold Sword', '6': 'Diamond Sword', '7': 'Emerald Sword',
        },
        pickaxe: {
            '0': '❌', '1': 'Wooden Pickaxe', '2': 'Stone Pickaxe',
            '3': 'Iron Pickaxe', '4': 'Gold Pickaxe', '6': 'Diamond Pickaxe', '7': 'Emerald Pickaxe',
        },
        fishingrod: true,
    },
    crates: { common: true, uncommon: true, mythic: true, legendary: true, pet: true },
    pets: { horse: 10, cat: 10, fox: 10, dog: 10 },
};







// RPG Adventure Data
const ADVENTURE_LOCATIONS = {
    forest: {
        name: "🌲 Mystic Forest", minLevel: 1,
        baseRewards: { money: [10, 50], exp: [15, 45], wood: [1, 3] },
        specialRewards: { uncommon: 0.3, mythic: 0.05 },
        healthCost: [5, 15], armorCost: [2, 8],
        events: ["treespirit", "hiddenchest","wolfpack", "ancientrune", "enchantedgrove", "losttrader", "moonlitclearing", "strangemushrooms", "hungrybear", "ancientoak", "banditambush"],
    },
    dungeon: {
        name: "🏰 Ancient Dungeon", minLevel: 5,
        baseRewards: { money: [50, 150], exp: [30, 80], rock: [1, 4] },
        specialRewards: { uncommon: 0.4, mythic: 0.1, legendary: 0.02 },
        healthCost: [15, 30], armorCost: [5, 15],
        events: ["traproom", "treasurevault", "bossencounter", "magicfountain", "ancientlibrary", "poisongas", "ghostlyapparition", "collapsedtunnel", "mysteriousorb"],
    },
    mountains: {
        name: "⛰️ Dragon Peaks", minLevel: 10,
        baseRewards: { money: [100, 300], exp: [50, 120], diamond: [0, 2] },
        specialRewards: { mythic: 0.15, legendary: 0.05, diamond: 0.2 },
        healthCost: [20, 40], armorCost: [8, 20],
        events: ["dragonencounter", "crystalcave", "avalanche", "skytemple", "stormypass", "eaglesnest", "frozencave", "cliffside_ruins", "mountain_hermit"],
    },
};

const ADVENTURE_EVENTS = {
    treespirit: {
        title: "🧚 Tree Spirit Encounter",
        image: "https://file.garden/aH6j2EOEQybcMMDx/droid.png",
        description: "A wise tree spirit offers you a choice... What is your choice?",
        choices: [
            { key: "A", text: "Accept blessing (+health)", buttonText: "Accept blessing", rewards: { health: 20, exp: 10 }, costs: { energy: 5 }, successRate: 0.9 },
            { key: "B", text: "Ask for knowledge (+exp)", buttonText: "Accept knowledge", rewards: { exp: 50, wisdom: 1 }, costs: { health: 5 }, successRate: 0.8 },
            { key: "C", text: "Request treasure (+rare item)", buttonText: "Request treasure", rewards: { uncommon: 1, money: 30 }, costs: { health: 10, luck: 2 }, successRate: 0.6 },
        ],
    },
    hiddenchest: {
        title: "📦 Hidden Chest",
        image: "https://file.garden/aH6j2EOEQybcMMDx/phone.png",
        description: "You discover a mysterious chest hidden among the roots. What do you do?",
        choices: [
            { key: "A", text: "Open carefully", buttonText: "Open carefully", rewards: { money: 50, exp: 20 }, costs: { energy: 10 }, successRate: 0.8 },
            { key: "B", text: "Check for traps first", buttonText: "Check for traps", rewards: { money: 30, exp: 40, agility: 1 }, costs: { energy: 15, time: 10 }, successRate: 0.9 },
            { key: "C", text: "Break it open", buttonText: "Break it open", rewards: { money: 70, wood: 2 }, costs: { health: 15, energy: 20 }, successRate: 0.6 },
        ],
    },
    wolfpack: {
        title: "🐺 Wolf Pack",
        image: "https://file.garden/aH6j2EOEQybcMMDx/wolves.png",
        description: "A pack of wolves blocks your path. How do you handle this situation?",
        choices: [
            { key: "A", text: "Fight them", buttonText: "Fight", rewards: { exp: 60, strength: 2, meat: 3 }, costs: { health: 25, armordurability: 10 }, successRate: 0.7 },
            { key: "B", text: "Try to sneak past", buttonText: "Sneak past", rewards: { exp: 30, agility: 1 }, costs: { energy: 20 }, successRate: 0.6 },
            { key: "C", text: "Offer food to distract", buttonText: "Offer food", rewards: { exp: 40, respect: 2 }, costs: { food: 2, energy: 10 }, successRate: 0.8 },
        ],
    },

    traproom: {
        title: "🕳️ Trap Room",
        image: "https://file.garden/aH6j2EOEQybcMMDx/trap.png",
        description: "You've triggered a trap! Quick thinking required... How do you react?",
        choices: [
            { key: "A", text: "Dodge quickly", buttonText: "Dodge quickly", rewards: { exp: 25, agility: 1 }, costs: { energy: 15 }, successRate: 0.6 },
            { key: "B", text: "Use tools to disable", buttonText: "Use tools", rewards: { exp: 40, rock: 1, tools: 1 }, costs: { tool_durability: 10, time: 15 }, successRate: 0.8 },
            { key: "C", text: "Tank the damage", buttonText: "Tank damage", rewards: { exp: 15, toughness: 2 }, costs: { health: 30, armordurability: 15 }, successRate: 0.9 },
        ],
    },
    treasurevault: {
        title: "💰 Treasure Vault",
        image: "https://file.garden/aH6j2EOEQybcMMDx/vault.png",
        description: "You've found an ancient treasure vault! How do you proceed?",
        choices: [
            { key: "A", text: "Take everything", buttonText: "Take everything", rewards: { money: 200, exp: 50 }, costs: { energy: 30, karma: -5 }, successRate: 0.7 },
            { key: "B", text: "Take only what you need", buttonText: "Take moderately", rewards: { money: 100, exp: 60, respect: 3 }, costs: { energy: 20 }, successRate: 0.9 },
            { key: "C", text: "Study the vault first", buttonText: "Study first", rewards: { exp: 80, knowledge: 2, money: 50 }, costs: { time: 40, energy: 15 }, successRate: 0.8 },
        ],
    },

    crystalcave: {
        title: "💎 Crystal Cave",
        image: "https://file.garden/aH6j2EOEQybcMMDx/crystal.png",
        description: "You discover a cave filled with glowing crystals...",
        choices: [
            { key: "A", text: "Mine the crystals", buttonText: "Mine crystals", rewards: { diamond: 3, exp: 45 }, costs: { energy: 25, pickaxedurability: 15 }, successRate: 0.7 },
            { key: "B", text: "Study their magic", buttonText: "Study magic", rewards: { exp: 70, magic_knowledge: 2 }, costs: { time: 40 }, successRate: 0.8 },
            { key: "C", text: "Take only small samples", buttonText: "Take samples", rewards: { diamond: 1, exp: 30, respect: 2 }, costs: { energy: 10 }, successRate: 0.9 },
        ],
    },
    dragonencounter: {
        title: "🐉 Dragon Encounter",
        image: "https://file.garden/aH6j2EOEQybcMMDx/dragon.png",
        description: "A mighty dragon appears before you! What is your approach?",
        choices: [
            { key: "A", text: "Challenge to combat", buttonText: "Fight dragon", rewards: { exp: 200, legendary: 1, dragonscale: 5 }, costs: { health: 50, armordurability: 30 }, successRate: 0.4 },
            { key: "B", text: "Attempt negotiation", buttonText: "Negotiate", rewards: { exp: 120, wisdom: 3, gold: 100 }, costs: { energy: 30 }, successRate: 0.6 },
            { key: "C", text: "Show respect and retreat", buttonText: "Respectful retreat", rewards: { exp: 80, respect: 5 }, costs: { energy: 20 }, successRate: 0.9 },
        ],
    },
};

// Store pending adventure choices
const pendingChoices = new Map();

// Types for better TypeScript support
interface RPGData {
    health: number; money: number; energy: number; armordurability: number;
    level: number; experience: number; eventProgress: Record<string, number>;
    eventDeficit: Record<string, number>; lastadventure: number; total_adventures: number;
    achievements: string[]; [key: string]: any;
}

interface Choice {
    key: string; text: string; buttonText: string; costs: Record<string, number>;
    rewards: Record<string, number>; successRate: number;
}

interface AdventureEvent {
    title: string; image: string; description: string; choices: Choice[];
}

interface AdventureLocation {
    name: string; minLevel: number; events: string[];
    healthCost: [number, number]; armorCost: [number, number];
    baseRewards: Record<string, [number, number]>;
    specialRewards: Record<string, number>;
}

const getCurrentEventIndex = (rpg: RPGData, locationKey: string): number => {
    if (!rpg.eventProgress) rpg.eventProgress = {};
    return rpg.eventProgress[locationKey] || 0;
};

const canAccessLocation = (rpg: RPGData, locationKey: string): boolean => {
    const locationOrder = ['forest', 'dungeon', 'mountains'];
    const currentLocationIndex = locationOrder.indexOf(locationKey);
    if (currentLocationIndex === 0) return true;
    const previousLocation = locationOrder[currentLocationIndex - 1];
    const previousLocationEvents = ADVENTURE_LOCATIONS[previousLocation].events.length;
    const currentProgress = getCurrentEventIndex(rpg, previousLocation);
    return currentProgress >= previousLocationEvents;
};

const getChoiceOutcome = (successRate: number): string => {
    const roll = Math.random();
    if (roll < successRate * 0.7) return 'pass';
    if (roll < successRate) return 'fair';
    return 'fail';
};

const getRandomInRange = ([min, max]: [number, number]): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getSpecialReward = (specialRewards: Record<string, number>): [string, number] | null => {
    const roll = Math.random();
    let cumulative = 0;
    for (const [reward, chance] of Object.entries(specialRewards)) {
        cumulative += chance;
        if (roll < cumulative) return [reward, 1];
    }
    return null;
};

// Handle quick reply button responses

const handleQuickReply = async (message: any): Promise<void> => {
    const sender = message.from;
    const buttonId = message.buttonResponseMessage?.selectedButtonId;
    
    if (!buttonId || !pendingChoices.has(sender)) {
        return;
    }

    const pendingChoice = pendingChoices.get(sender);
    const { locationKey, eventKey, location, event } = pendingChoice;
    
    // Find the selected choice
    const selectedChoice = event.choices.find((choice: Choice) => 
        buttonId === `${locationKey}_${eventKey}_${choice.key}`
    );
    
    if (!selectedChoice) {
        return await botBaileys.sendText(sender, "❌ Invalid choice selection!");
    }

    // Clear the pending choice
    pendingChoices.delete(sender);
    
    // Process the adventure with the selected choice
    await processAdventureChoice(message, locationKey, eventKey, location, event, selectedChoice);
};
// Handle text-based choice responses (add this function)
const handleTextChoice = async (message) => {
    const sender = message.from;
    const choice = message.body?.trim().toUpperCase();
    
    if (!['A', 'B', 'C'].includes(choice) || !pendingChoices.has(sender)) {
        return false; // Not a valid choice or no pending choice
    }

    const pendingChoice = pendingChoices.get(sender);
    const { locationKey, eventKey, location, event } = pendingChoice;
    
    // Find the selected choice
    const selectedChoice = event.choices.find((c) => c.key === choice);
    
    if (!selectedChoice) {
        return false;
    }

    // Clear the pending choice
    pendingChoices.delete(sender);
    
    // Process the adventure with the selected choice
    await processAdventureChoice(message, locationKey, eventKey, location, event, selectedChoice);
    return true; // Choice was handled
};

// Process adventure choice (extracted from handleAdventureEvent)
const processAdventureChoice = async (
    message: any, 
    locationKey: string, 
    eventKey: string, 
    location: AdventureLocation, 
    event: AdventureEvent, 
    selectedChoice: Choice
): Promise<void> => {
    const sender = message.from;
    
    try {
        const userData = await findUserRpg(sender);
        const rpg: RPGData = userData.rpg;

        // Check costs
        const costErrors: string[] = [];
        for (const [cost, amount] of Object.entries(selectedChoice.costs) as [string, number][]) {
            if (cost === 'health' && rpg.health < amount) {
                costErrors.push(`❤️ Health: Need ${amount}, have ${rpg.health}`);
            }
            if (cost === 'money' && (rpg.money || 0) < amount) {
                costErrors.push(`💰 Money: Need ${amount}, have ${rpg.money || 0}`);
            }
            if (cost === 'armordurability' && (rpg.armordurability || 0) < amount) {
                costErrors.push(`🛡️ Armor: Need ${amount}, have ${rpg.armordurability || 0}`);
            }
            if (cost === 'energy' && (rpg.energy || 0) < amount) {
                costErrors.push(`⚡ Energy: Need ${amount}, have ${rpg.energy || 0}`);
            }
        }

        if (costErrors.length > 0) {
            return await botBaileys.sendText(sender, `❌ *Insufficient Resources!*\n\n${costErrors.join('\n')}`);
        }

        const outcome = getChoiceOutcome(selectedChoice.successRate);
        let resultMsg: string;
        let canProgress = false;
        let deficitChange = 0;

        switch (outcome) {
            case 'pass':
                resultMsg = "✅ *Perfect Pass!*";
                canProgress = true;
                break;
            case 'fair':
                resultMsg = "⚡ *Fair Pass!*";
                canProgress = true;
                deficitChange = 2;
                break;
            case 'fail':
                resultMsg = "❌ *Failed!*";
                break;
            default:
                resultMsg = "❓ *Unknown outcome!*";
                break;
        }

        // Apply costs
        for (const [cost, amount] of Object.entries(selectedChoice.costs) as [string, number][]) {
            if (rpg.hasOwnProperty(cost)) {
                rpg[cost] = Math.max(0, (rpg[cost] || 0) - amount);
            }
        }

        const actualRewards: Record<string, number> = {};
        let rewardMultiplier: number;

        switch (outcome) {
            case 'pass':
                rewardMultiplier = 1.0;
                break;
            case 'fair':
                rewardMultiplier = 0.7;
                break;
            case 'fail':
                rewardMultiplier = 0.2;
                break;
            default:
                rewardMultiplier = 0;
                break;
        }

        // Apply choice rewards
        for (const [reward, amount] of Object.entries(selectedChoice.rewards) as [string, number][]) {
            const actualAmount = Math.floor(amount * rewardMultiplier);
            if (actualAmount > 0) {
                actualRewards[reward] = actualAmount;
                if (reward === 'health') {
                    rpg[reward] = Math.min(100, Math.max(0, (rpg[reward] || 0) + actualAmount));
                } else if (reward === 'exp' || reward === 'experience') {
                    rpg.experience = Math.max(0, (rpg.experience || 0) + actualAmount);
                } else {
                    rpg[reward] = Math.max(0, (rpg[reward] || 0) + actualAmount);
                }
            }
        }

        // Apply base location rewards
        for (const [reward, range] of Object.entries(location.baseRewards) as [string, [number, number]][]) {
            const amount = getRandomInRange(range) * (outcome === 'pass' ? 1 : outcome === 'fair' ? 0.7 : 0.3);
            const actualAmount = Math.floor(amount);
            if (actualAmount > 0) {
                actualRewards[reward] = (actualRewards[reward] || 0) + actualAmount;
                rpg[reward] = Math.max(0, (rpg[reward] || 0) + actualAmount);
            }
        }

        // Apply special rewards
        const specialReward = getSpecialReward(location.specialRewards);
        if (specialReward && (outcome === 'pass' || outcome === 'fair')) {
            const [reward, amount] = specialReward;
            actualRewards[reward] = (actualRewards[reward] || 0) + amount;
            rpg[reward] = Math.max(0, (rpg[reward] || 0) + amount);
        }

        // Apply location costs
        const healthCost = getRandomInRange(location.healthCost);
        const armorCost = getRandomInRange(location.armorCost);
        rpg.health = Math.max(0, rpg.health - healthCost);
        rpg.armordurability = Math.max(0, rpg.armordurability - armorCost);

        // Update progress
        if (canProgress) {
            const currentEventIndex = getCurrentEventIndex(rpg, locationKey);
            rpg.eventProgress[locationKey] = currentEventIndex + 1;
            rpg.eventDeficit[locationKey] = (rpg.eventDeficit[locationKey] || 0) + deficitChange;
        }

        rpg.total_adventures = (rpg.total_adventures || 0) + 1;
        await editRpg(sender, { rpg });

        // Format response message
        const rewardsList = Object.entries(actualRewards)
            .filter(([_, v]) => v > 0)
            .map(([k, v]) => `⮕ ${k}: +${v}`)
            .join('\n');

        const costsList = [
            `⮕ Health: -${healthCost}`,
            `⮕ Armor Durability: -${armorCost}`,
            ...Object.entries(selectedChoice.costs)
                .filter(([k, v]) => v > 0 && k !== 'health' && k !== 'armordurability')
                .map(([k, v]) => `⮕ ${k}: -${v}`)
        ].join('\n');

        let progressMsg = "";
        let nextEventMsg = "";

        if (canProgress) {
            const newEventIndex = rpg.eventProgress[locationKey];
            if (newEventIndex >= location.events.length) {
                progressMsg = `\n🎉 *${location.name} Completed!* You can now access the next location!`;
                if (rpg.eventDeficit[locationKey] > 0) {
                    const penalty = rpg.eventDeficit[locationKey] * 5;
                    rpg.money = Math.max(0, (rpg.money || 0) - penalty);
                    progressMsg += `\n💰 *Deficit Penalty:* -${penalty} money for ${rpg.eventDeficit[locationKey]} fair passes`;
                    rpg.eventDeficit[locationKey] = 0;
                    await editRpg(sender, { rpg });
                }
            } else {
                const nextEvent = location.events[newEventIndex];
                nextEventMsg = `\n**Next Event:**\nadventure ${locationKey} ${nextEvent}`;
            }
        } else {
            nextEventMsg = `\n🔄 *Try Again:* adventure ${locationKey} ${eventKey}`;
        }

        const deficitMsg = rpg.eventDeficit[locationKey] > 0
            ? `\n⚠️ **Current Deficit:** ${rpg.eventDeficit[locationKey]} points (from fair passes)`
            : '';

        const currentProgress = rpg.eventProgress[locationKey] || 0;
        const totalEvents = location.events.length;
        const progressStatus = `\n**Progress:** ${currentProgress}/${totalEvents} events completed`;

        return await botBaileys.sendText(sender,
            `🗺️ **Adventure in ${location.name}**\n` +
            `🎭 *${event.title}*\n` +
            `*You chose: ${selectedChoice.text}*\n\n` +
            `${resultMsg}\n\n` +
            `**Rewards Gained:**\n${rewardsList || '⮕ None'}\n\n` +
            `**Costs:**\n${costsList}${nextEventMsg}${deficitMsg}${progressStatus}\n\n` +
            `*Total Adventures: ${rpg.total_adventures}*`
        );
    } catch (error) {
        console.error('Adventure choice processing error:', error);
        return await botBaileys.sendText(sender, '❌ An error occurred during the adventure. Please try again.');
    }
};

// Adventure Handler - Replace the section with sendButtonMessage
const handleAdventureEvent = async (message, args) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        if (args.length < 2) {
            return await botBaileys.sendText(sender,
                `🎮 *Adventure Usage:*\n\n` +
                `Send: adventure <location> <event>\n` +
                `Example: adventure forest treespirit\n\n` +
                `📍 *Available Locations:*\n` +
                `• forest - 🌲 Mystic Forest (Level 1+)\n` +
                `• dungeon - 🏰 Ancient Dungeon (Level 5+)\n` +
                `• mountains - ⛰️ Dragon Peaks (Level 10+)`
            );
        }

        const locationArg = args[0]?.toLowerCase();
        const eventArg = args[1]?.toLowerCase();
        const location = ADVENTURE_LOCATIONS[locationArg];

        if (!location) {
            return await botBaileys.sendText(sender, `❌ Unknown location: ${locationArg}`);
        }

        if (rpg.level < location.minLevel) {
            return await botBaileys.sendText(sender,
                `⚠️ You need level ${location.minLevel} for ${location.name}!\n` +
                `Your current level: ${rpg.level}`
            );
        }

        if (!canAccessLocation(rpg, locationArg)) {
            const prevLocation = locationArg === 'dungeon' ? 'forest' : 'dungeon';
            return await botBaileys.sendText(sender,
                `❌ You must complete all events in ${ADVENTURE_LOCATIONS[prevLocation].name} before accessing ${location.name}!`
            );
        }

        const event = ADVENTURE_EVENTS[eventArg];
        if (!event) {
            return await botBaileys.sendText(sender, `❌ Unknown event: ${eventArg}`);
        }

        if (!location.events.includes(eventArg)) {
            const availableEvents = location.events.join(', ');
            return await botBaileys.sendText(sender,
                `❌ ${event.title} is not available in ${location.name}!\n\n` +
                `📋 *Available events in ${location.name}:*\n${availableEvents}`
            );
        }

        const currentEventIndex = getCurrentEventIndex(rpg, locationArg);
        const targetEventIndex = location.events.indexOf(eventArg);
        const currentEventName = location.events[currentEventIndex];

        if (targetEventIndex !== currentEventIndex) {
            return await botBaileys.sendText(sender,
                `⚠️ You must complete events in order!\n` +
                `Next event: adventure ${locationArg} ${currentEventName}`
            );
        }

        if (!rpg.eventDeficit) rpg.eventDeficit = {};
        if (!rpg.eventDeficit[locationArg]) rpg.eventDeficit[locationArg] = 0;

        // Store the pending choice for this user
        pendingChoices.set(sender, {
            locationKey: locationArg,
            eventKey: eventArg,
            location: location,
            event: event
        });

        const deficitMsg = rpg.eventDeficit[locationArg] > 0
            ? `\n⚠️ *Current Deficit: ${rpg.eventDeficit[locationArg]} points* (from fair passes)\n`
            : '';

        const choicesText = event.choices.map((choice, index) => 
            `${choice.key}. ${choice.text}`
        ).join('\n');

        const caption = `🎭 *${event.title}* (Event ${currentEventIndex + 1}/${location.events.length})${deficitMsg}\n\n` +
            `${event.description}\n\n` +
            `*Choose your action:*\n${choicesText}\n\n` +
            `*Reply with the letter of your choice (A, B, or C)*`;

        // Send image with text choices instead of buttons
        await botBaileys.sendMedia(sender, event.image, caption);

    } catch (error) {
        console.error('Adventure event error:', error);
        return await botBaileys.sendText(sender, '❌ An error occurred during the adventure. Please try again.');
    }
};

const handleAdventureCommand = async (message, args) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        if (!rpg.level) rpg.level = 1;
        if (!rpg.eventProgress) rpg.eventProgress = {};
        if (!rpg.eventDeficit) rpg.eventDeficit = {};

        if (args.length >= 2) {
            const locationArg = args[0]?.toLowerCase();
            const eventArg = args[1]?.toLowerCase();
            const location = ADVENTURE_LOCATIONS[locationArg];
            if (location && ADVENTURE_EVENTS[eventArg] && location.events.includes(eventArg)) {
                return await handleAdventureEvent(message, args);
            }
        }

        if (rpg.health < 50) {
            return await botBaileys.sendText(sender,
                `❌ You need at least 50 health to adventure! Use heal command to restore health.`
            );
        }

        const locationArg = args[0]?.toLowerCase();
        const availableLocations = Object.entries(ADVENTURE_LOCATIONS)
            .filter(([key, loc]) => rpg.level >= loc.minLevel && canAccessLocation(rpg, key));

        if (!locationArg) {
            const locationList = availableLocations
                .map(([key, loc]) => {
                    const progress = getCurrentEventIndex(rpg, key);
                    const total = loc.events.length;
                    const progressStatus = progress >= total ? '✅ Completed' : `📍 ${progress}/${total}`;
                    return `${key} - ${loc.name} (Level ${loc.minLevel}+) ${progressStatus}`;
                })
                .join('\n');
            return await botBaileys.sendText(sender,
                `🗺️ **Choose your adventure location:**\n${locationList}\n\n` +
                `Usage: .adventure <location>\n`
            );
        }

        const location = ADVENTURE_LOCATIONS[locationArg];
        if (!location) {
            return await botBaileys.sendText(sender,
                `❌ Unknown location! Type ".adventure" to see available locations.`
            );
        }

        if (rpg.level < location.minLevel) {
            return await botBaileys.sendText(sender,
                `⚠️ You need level ${location.minLevel} to adventure in ${location.name}!`
            );
        }

        if (!canAccessLocation(rpg, locationArg)) {
            const prevLocation = locationArg === 'dungeon' ? 'forest' : 'dungeon';
            return await botBaileys.sendText(sender,
                `❌ You must complete all events in ${ADVENTURE_LOCATIONS[prevLocation].name} before accessing ${location.name}!`
            );
        }

        const currentEventIndex = getCurrentEventIndex(rpg, locationArg);
        if (currentEventIndex >= location.events.length) {
            const deficitMsg = rpg.eventDeficit[locationArg] > 0
                ? `\n⚠️ **Current Deficit:** ${rpg.eventDeficit[locationArg]} points (from fair passes)`
                : '';
            return await botBaileys.sendText(sender,
                `🎉 **${location.name} Completed!**\n\n` +
                `**Progress:** ${currentEventIndex}/${location.events.length} events completed${deficitMsg}\n\n` +
                `*Total Adventures: ${rpg.total_adventures || 0}*\n\n` +
                `You can now access the next location! Type ".adventure" to see available locations.`
            );
        }

        const nextEventName = location.events[currentEventIndex];
        const nextEvent = ADVENTURE_EVENTS[nextEventName];
        const deficitMsg = rpg.eventDeficit[locationArg] > 0
            ? `\n⚠️ **Current Deficit:** ${rpg.eventDeficit[locationArg]} points (from fair passes)`
            : '';

        const eventsList = location.events
            .map((eventName, index) => {
                const status = index < currentEventIndex ? '✅' : 
                              index === currentEventIndex ? '🔄' : '⏳';
                return `${status} ${index + 1}. ${eventName}`;
            })
            .join('\n');

        return await botBaileys.sendText(sender,
            `🗺️ **${location.name}** (Level ${location.minLevel}+)\n\n` +
            `**Your Progress:** ${currentEventIndex}/${location.events.length} events completed${deficitMsg}\n\n` +
            `**Next Event:** ${nextEvent.title}\n` +
            `Command: adventure ${locationArg} ${nextEventName}\n\n` +
            `**All Events:**\n${eventsList}\n\n` +
            `**Base Rewards:**\n` +
            `💰 Money: ${location.baseRewards.money[0]}-${location.baseRewards.money[1]}\n` +
            `⭐ Experience: ${location.baseRewards.exp[0]}-${location.baseRewards.exp[1]}\n` +
            `**Health Cost:** ${location.healthCost[0]}-${location.healthCost[1]}\n` +
            `**Armor Cost:** ${location.armorCost[0]}-${location.armorCost[1]}`
        );

    } catch (error) {
        console.error('Adventure command error:', error);
        return await botBaileys.sendText(sender, '❌ An error occurred. Please try again.');
    }
};


// Game Command Handlers
const handleGameMenu = async (message) => {
    const sender = message.from;
    const menuText = `🎮 **ADVENTURE RPG GAME MENU** 🎮

📋 **MAIN COMMANDS:**
• \`.menu\` - Show this menu
• \`.profile\` - View your character stats
• \`.inventory\` - Check your items & equipment

🗺️ **ADVENTURE & EXPLORATION:**
• \`.adventure\` - Start adventures in different locations
• \`.adventure <location>\` - View location details
• \`.adventure <location> <event>\` - Engage in specific events

⚔️ **CRAFTING & EQUIPMENT:**
• \`.blacksmith\` - View crafting options
• \`.createsword <type>\` - Craft swords (wooden, stone, iron, gold, diamond, emerald)
• \`.createarmor <type>\` - Craft armor (wooden, stone, iron, gold, diamond, emerald)
• \`.createpickaxe <type>\` - Craft pickaxes (wooden, stone, iron, gold, diamond, emerald)
• \`.createfishingrod\` - Craft a fishing rod

🏪 **SHOPPING & TRADING:**
• \`.shop\` - View shop options
• \`.buy <item> [quantity]\` - Buy items (potion, trash, crates)
• \`.sell <item> [quantity]\` - Sell items for money

🎁 **CRATES & REWARDS:**
• \`.open <crate> [quantity]\` - Open crates (common, uncommon, mythic, legendary, pet)

🐾 **PETS & ACTIVITIES:**
• \`.pet <type>\` - Adopt pets (horse, cat, fox, dog)
• \`.fishing\` - Go fishing (requires fishing rod)

❤️ **HEALTH & RECOVERY:**
• \`.heal [quantity]\` - Use potions to restore health

💡 **TIPS:**
- Start with adventures in the forest to gain experience
- Craft better equipment for harder locations
- Use potions to heal when health is low
- Open crates for rare materials and pets
- Level up by gaining experience from adventures

Type any command to get started! 🚀`;

    return await botBaileys.sendText(sender, menuText);
};

const handleProfile = async (message) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        // Initialize missing fields
        if (!rpg.level) rpg.level = 1;
        if (!rpg.experience) rpg.experience = 0;
        if (!rpg.health) rpg.health = 100;
        if (!rpg.money) rpg.money = 0;
        if (!rpg.energy) rpg.energy = 100;
        if (!rpg.total_adventures) rpg.total_adventures = 0;

        const profileText = `👤 **PLAYER PROFILE**

🏷️ **Basic Stats:**
• Level: ${rpg.level}
• Experience: ${rpg.experience}
• Health: ${rpg.health}/100 ❤️
• Energy: ${rpg.energy}/100 ⚡
• Money: ${rpg.money} 💰

⚔️ **Equipment:**
• Sword: ${inventoryDisplay.tools.sword[rpg.sword?.toString()] || '❌ None'}
• Armor: ${inventoryDisplay.tools.armor[rpg.armor?.toString()] || '❌ None'}
• Pickaxe: ${inventoryDisplay.tools.pickaxe[rpg.pickaxe?.toString()] || '❌ None'}
• Fishing Rod: ${rpg.fishingrod ? '🎣 Active' : '❌ None'}

📊 **Adventure Progress:**
• Total Adventures: ${rpg.total_adventures}
• Forest Progress: ${rpg.eventProgress?.forest || 0}/3
• Dungeon Progress: ${rpg.eventProgress?.dungeon || 0}/3
• Mountains Progress: ${rpg.eventProgress?.mountains || 0}/3

Use \`.inventory\` to see all your items!`;

        return await botBaileys.sendText(sender, profileText);
    } catch (error) {
        console.error('Profile error:', error);
        return await botBaileys.sendText(sender, '❌ Error loading profile. Please try again.');
    }
};

const handleInventory = async (message) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        const tools = Object.keys(inventoryDisplay.tools)
            .map((v) => {
                if (rpg[v]) {
                    const toolDisplay = typeof inventoryDisplay.tools[v] === 'object'
                        ? inventoryDisplay.tools[v][rpg[v]?.toString()]
                        : rpg[v] ? 'Active' : '❌';
                    const durability = rpg[`${v}durability`] ? ` (${rpg[`${v}durability`]} durability)` : '';
                    return `⮕ ${v}: ${toolDisplay}${durability}`;
                }
                return null;
            })
            .filter((v) => v)
            .join('\n');

        const items = Object.keys(inventoryDisplay.items)
            .map((v) => rpg[v] ? `⮕ ${v}: ${rpg[v]}` : null)
            .filter((v) => v)
            .join('\n');

        const crates = Object.keys(inventoryDisplay.crates)
            .map((v) => rpg[v] ? `⮕ ${v}: ${rpg[v]}` : null)
            .filter((v) => v)
            .join('\n');

        const pets = Object.keys(inventoryDisplay.pets)
            .map((v) => {
                if (rpg[v]) {
                    const level = rpg[v] >= inventoryDisplay.pets[v] ? 'Max Level' : `Level ${rpg[v]}`;
                    return `⮕ ${v}: ${level}`;
                }
                return null;
            })
            .filter((v) => v)
            .join('\n');

        const inventoryText = `🎒 **INVENTORY**

👤 **Character Stats:**
${Object.keys(inventoryDisplay.others).map((v) => rpg[v] ? `⮕ ${v}: ${rpg[v]}` : null).filter((v) => v).join('\n')}

${tools ? `🔧 **Tools:**\n${tools}\n` : ''}
${items ? `📦 **Items:**\n${items}\n` : ''}
${crates ? `🎁 **Crates:**\n${crates}\n` : ''}
${pets ? `🐾 **Pets:**\n${pets}` : ''}

${!tools && !items && !crates && !pets ? 'Your inventory is empty! Start adventuring to collect items.' : ''}`;

        return await botBaileys.sendText(sender, inventoryText);
    } catch (error) {
        console.error('Inventory error:', error);
        return await botBaileys.sendText(sender, '❌ Error loading inventory. Please try again.');
    }
};

const handleBlacksmith = async (message: any, args: string[]) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        const command = args[0]?.toLowerCase() || 'createsword';
        const validCommands = ['createsword', 'createarmor', 'createpickaxe', 'createfishingrod'];

        if (!validCommands.includes(command)) {
            const commandList = Object.keys(blacksmith).map(cmd => {
                const items = Object.keys(blacksmith[cmd]).map(item => {
                    const materials = Object.entries(blacksmith[cmd][item].material)
                        .map(([k, v]) => `${v as number} ${k}`)
                        .join(', ');
                    return `  • ${item} (${materials})`;
                }).join('\n');
                return `**${cmd.toUpperCase()}:**\n${items}`;
            }).join('\n\n');
            
            return await botBaileys.sendText(sender,
                `🔨 **BLACKSMITH WORKSHOP** 🔨\n\n${commandList}\n\n**Usage:** .${command} <item_type>\n**Example:** .createsword iron`
            );
        }

        const toolType = command === 'createsword' ? 'sword' :
                        command === 'createarmor' ? 'armor' :
                        command === 'createpickaxe' ? 'pickaxe' : 'fishingrod';
        
        const itemType = args[1]?.toLowerCase();
        const listItems = blacksmith[command];
        
        if (!itemType || !listItems[itemType]) {
            const options = Object.keys(listItems).map(item => {
                const materials = Object.entries(listItems[item].material)
                    .map(([k, v]) => `${v as number} ${k}`)
                    .join(', ');
                return `• ${item} - Materials: ${materials}`;
            }).join('\n');
            
            return await botBaileys.sendText(sender,
                `🔨 **${command.toUpperCase()}**\n\nAvailable options:\n${options}\n\n**Usage:** .${command} <type>`
            );
        }

        // Check if player already has the tool (except fishing rod)
        if (rpg[toolType] !== 0 && toolType !== 'fishingrod') {
            return await botBaileys.sendText(sender, `You already have a ${toolType}! Come back when it's destroyed.`);
        }
        if (toolType === 'fishingrod' && rpg[toolType]) {
            return await botBaileys.sendText(sender, `You already have a fishing rod! Come back when it's destroyed.`);
        }

        // Check materials with proper typing
        const missingMaterials: string[] = [];
        for (const [material, amount] of Object.entries(listItems[itemType].material)) {
            const requiredAmount = amount as number;
            if ((rpg[material] || 0) < requiredAmount) {
                missingMaterials.push(`${requiredAmount - (rpg[material] || 0)} ${material}`);
            }
        }
        
        if (missingMaterials.length > 0) {
            return await botBaileys.sendText(sender,
                `❌ Insufficient materials!\nYou need: ${missingMaterials.join(', ')}`
            );
        }

        // Craft the item with proper typing
        for (const [material, amount] of Object.entries(listItems[itemType].material)) {
            const requiredAmount = amount as number;
            rpg[material] -= requiredAmount;
        }

        rpg[toolType] = listItems[itemType].id;
        rpg[`${toolType}durability`] = listItems[itemType].durability;

        await editRpg(sender, { rpg });
        return await botBaileys.sendText(sender, `🔨 Successfully crafted your ${itemType} ${toolType}!`);

    } catch (error) {
        console.error('Blacksmith error:', error);
        return await botBaileys.sendText(sender, '❌ Error at blacksmith. Please try again.');
    }
};

const handleShop = async (message, args) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        const command = args[0]?.toLowerCase() || 'buy';

        if (!['buy', 'sell'].includes(command)) {
            return await botBaileys.sendText(sender,
                `🏪 **SHOP** 🏪\n\nCommands:\n• .buy <item> [quantity] - Purchase items\n• .sell <item> [quantity] - Sell items\n\nUse .buy or .sell to see available items!`
            );
        }

        const item = args[1]?.toLowerCase();
        const quantity = Math.max(1, isNumber(parseInt(args[2])) ? parseInt(args[2]) : 1);
        const listItems = shopItems[command];

        if (!item || !listItems[item]) {
            const title = command === 'buy' ? '🛒 **BUY ITEMS**' : '💰 **SELL ITEMS**';
            const options = Object.keys(listItems).map(v => {
                const paymentMethod = Object.keys(listItems[v])[0];
                const price = listItems[v][paymentMethod];
                return `• ${v} - ${price} ${paymentMethod} each`;
            }).join('\n');

            return await botBaileys.sendText(sender,
                `${title}\n\nAvailable items:\n${options}\n\n**Usage:** .${command} <item> [quantity]`
            );
        }

        const paymentMethod = Object.keys(listItems[item])[0];
        const price = listItems[item][paymentMethod];
        const totalCost = price * quantity;

        if (command === 'buy') {
            if ((rpg[paymentMethod] || 0) < totalCost) {
                return await botBaileys.sendText(sender,
                    `❌ Insufficient ${paymentMethod}!\nYou need: ${totalCost}\nYou have: ${rpg[paymentMethod] || 0}\nShortage: ${totalCost - (rpg[paymentMethod] || 0)}`
                );
            }

            rpg[paymentMethod] -= totalCost;
            rpg[item] = (rpg[item] || 0) + quantity;

            await editRpg(sender, { rpg });
            return await botBaileys.sendText(sender,
                `✅ Successfully bought ${quantity} ${item}(s) for ${totalCost} ${paymentMethod}!`
            );
        } else {
            if ((rpg[item] || 0) < quantity) {
                return await botBaileys.sendText(sender,
                    `❌ You don't have enough ${item}!\nYou have: ${rpg[item] || 0}\nTrying to sell: ${quantity}`
                );
            }

            rpg[item] -= quantity;
            rpg.money = (rpg.money || 0) + totalCost;
            await editRpg(sender, { rpg });
            return await botBaileys.sendText(sender,
                `✅ Successfully sold ${quantity} ${item}(s) for ${totalCost} money!`
            );
        }

    } catch (error) {
        console.error('Shop error:', error);
        return await botBaileys.sendText(sender, '❌ Error at shop. Please try again.');
    }
};

const handleOpen = async (message: any, args: string[]) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        const crateType = args[0]?.toLowerCase();
        const quantity = Math.max(1, isNumber(parseInt(args[1])) ? parseInt(args[1]) : 1);
        
        if (!crateType || !crateRewards[crateType]) {
            const availableCrates = Object.keys(crateRewards).map(crate =>
                `• ${crate}: ${rpg[crate] || 0} available`
            ).join('\n');
            
            return await botBaileys.sendText(sender,
                `🎁 **OPEN CRATES** 🎁\n\nYour crates:\n${availableCrates}\n\n**Usage:** .open <crate_type> [quantity]\n**Example:** .open common 5`
            );
        }
        
        if ((rpg[crateType] || 0) < quantity) {
            return await botBaileys.sendText(sender,
                `❌ Not enough ${crateType} crates!\nYou have: ${rpg[crateType] || 0}\nTrying to open: ${quantity}\nShortage: ${quantity - (rpg[crateType] || 0)}`
            );
        }

        // Process crate opening
        const totalRewards: { [key: string]: number } = {};
        for (let i = 0; i < quantity; i++) {
            for (const [reward, value] of Object.entries(crateRewards[crateType])) {
                if (reward in rpg || ['money', 'exp', 'experience'].includes(reward)) {
                    const amount = Array.isArray(value)
                        ? value[Math.floor(Math.random() * value.length)]
                        : value as number;
                    if (amount > 0) {
                        totalRewards[reward] = (totalRewards[reward] || 0) + amount;
                    }
                }
            }
        }
        
        // Apply rewards
        rpg[crateType] -= quantity;
        for (const [reward, amount] of Object.entries(totalRewards)) {
            if (reward === 'exp' || reward === 'experience') {
                rpg.experience = (rpg.experience || 0) + amount;
            } else {
                rpg[reward] = (rpg[reward] || 0) + amount;
            }
        }
        
        await editRpg(sender, { rpg });
        
        const rewardsList = Object.entries(totalRewards)
            .filter(([_, amount]) => amount > 0)
            .map(([reward, amount]) => `• ${reward}: +${amount}`)
            .join('\n');

        const rareItems = ['diamond', 'mythic', 'pet', 'legendary', 'emerald'].filter(item => totalRewards[item]);
        const rareBonus = rareItems.length > 0
            ? `\n\n🎉 **RARE DROPS!** ${rareItems.map(item => `${totalRewards[item]} ${item}`).join(', ')}`
            : '';

        return await botBaileys.sendText(sender,
            `🎁 **Opened ${quantity} ${crateType} crate(s)!**\n\n**Rewards:**\n${rewardsList}${rareBonus}`
        );
        
    } catch (error) {
        console.error('Open crates error:', error);
        return await botBaileys.sendText(sender, '❌ Error opening crates. Please try again.');
    }
};

const handleHeal = async (message, args) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        if (rpg.health >= 100) {
            return await botBaileys.sendText(sender, '❤️ Your health is already full!');
        }

        const quantity = Math.max(1, isNumber(parseInt(args[0])) ? parseInt(args[0]) : 1);

        if ((rpg.potion || 0) < quantity) {
            return await botBaileys.sendText(sender,
                `❌ Not enough potions!\nYou have: ${rpg.potion || 0}\nTrying to use: ${quantity}\nBuy more potions with: .buy potion ${quantity - (rpg.potion || 0)}`
            );
        }

        rpg.potion -= quantity;
        const healAmount = quantity * 40;
        rpg.health = Math.min(100, rpg.health + healAmount);

        await editRpg(sender, { rpg });
        return await botBaileys.sendText(sender,
            `❤️ Used ${quantity} potion(s) to restore ${healAmount} health!\nCurrent health: ${rpg.health}/100`
        );

    } catch (error) {
        console.error('Heal error:', error);
        return await botBaileys.sendText(sender, '❌ Error using potion. Please try again.');
    }
};

const handleFishing = async (message) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        if (!rpg.fishingrod) {
            return await botBaileys.sendText(sender, '🎣 You need a fishing rod! Craft one at the blacksmith with: .createfishingrod fishingrod');
        }

        if ((rpg.fishingroddurability || 0) < 5) {
            return await botBaileys.sendText(sender, '🎣 Your fishing rod is broken! Craft a new one at the blacksmith.');
        }

        const cooldown = 300000; // 5 minutes
        const now = Date.now();
        const lastFishing = rpg.lastfishing || 0;

        if (now - lastFishing < cooldown) {
            const remainingTime = Math.ceil((cooldown - (now - lastFishing)) / 1000);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            return await botBaileys.sendText(sender,
                `🎣 Please wait ${minutes}m ${seconds}s before fishing again!`
            );
        }

        // Process fishing
        rpg.fishingroddurability -= 5;
        const rewards = {
            money: Math.floor(Math.random() * 120) + 1,
            trash: Math.floor(Math.random() * 30) + 1
        };
        
        rpg.money = (rpg.money || 0) + rewards.money;
        rpg.trash = (rpg.trash || 0) + rewards.trash;
        rpg.lastfishing = now;

        let resultMessage = `🎣 **Fishing Complete!**\n\n**Rewards:**\n• Money: +${rewards.money}\n• Trash: +${rewards.trash}\n\nFishing rod durability: ${rpg.fishingroddurability}`;

        // Check if fishing rod broke
        if (rpg.fishingroddurability < 5) {
            rpg.fishingrod = false;
            rpg.fishingroddurability = 0;
            resultMessage += '\n\n💥 **Your fishing rod broke!** Craft a new one at the blacksmith.';
        }

        await editRpg(sender, { rpg });
        return await botBaileys.sendText(sender, resultMessage);

    } catch (error) {
        console.error('Fishing error:', error);
        return await botBaileys.sendText(sender, '❌ Error while fishing. Please try again.');
    }
};

const handlePet = async (message, args) => {
    const sender = message.from;
    try {
        const userData = await findUserRpg(sender);
        const rpg = userData.rpg;

        const pet = args[0]?.toLowerCase();

        if (!pet || !inventoryDisplay.pets[pet]) {
            const availablePets = Object.keys(inventoryDisplay.pets).join(', ');
            const petStatus = Object.keys(inventoryDisplay.pets).map(p => 
                `• ${p}: ${rpg[p] ? `Level ${rpg[p]}/${inventoryDisplay.pets[p]}` : 'Not owned'}`
            ).join('\n');

            return await botBaileys.sendText(sender,
                `🐾 **PET ADOPTION** 🐾\n\nAvailable pets: ${availablePets}\n\n**Your pets:**\n${petStatus}\n\n**Usage:** .pet <pet_type>\n**Example:** .pet cat\n\n💡 You need pet crates to adopt pets! Open them with: .open pet`
            );
        }

        if ((rpg.pet || 0) < 1) {
            return await botBaileys.sendText(sender,
                `❌ You need a pet crate to adopt a ${pet}!\nOpen pet crates with: .open pet`
            );
        }

        if ((rpg[pet] || 0) >= inventoryDisplay.pets[pet]) {
            return await botBaileys.sendText(sender,
                `✅ Your ${pet} is already at max level (${inventoryDisplay.pets[pet]})!`
            );
        }

        // Adopt/level up pet
        rpg.pet -= 1;
        rpg[pet] = (rpg[pet] || 0) + 1;
        rpg[`${pet}exp`] = (rpg[`${pet}exp`] || 0) + 50;

        await editRpg(sender, { rpg });

        const isNewPet = rpg[pet] === 1;
        const actionText = isNewPet ? 'Adopted' : 'Leveled up';

        return await botBaileys.sendText(sender,
            `🐾 **${actionText} your ${pet}!**\n\n• Level: ${rpg[pet]}/${inventoryDisplay.pets[pet]}\n• Experience: ${rpg[`${pet}exp`]}\n\n${isNewPet ? `Welcome your new ${pet} companion!` : `Your ${pet} is getting stronger!`}`
        );

    } catch (error) {
        console.error('Pet error:', error);
        return await botBaileys.sendText(sender, '❌ Error with pet adoption. Please try again.');
    }
};







// YouTube Handlers
const handleYouTubeSearch = async (phoneNumber, query) => {
    try {
        const session = getUserSession(phoneNumber);
        if (query.toLowerCase() === 'cancel') {
            resetUserSession(phoneNumber);
            return await botBaileys.sendText(phoneNumber, '❌ YouTube search cancelled.');
        }

        await botBaileys.sendText(phoneNumber, '🔍 Searching YouTube...');
        const videoInfo = await getYoutubeVideoInfo(query);

        if (videoInfo.error) {
            resetUserSession(phoneNumber);
            return await botBaileys.sendText(phoneNumber, `❌ ${videoInfo.error}`);
        }

        const info = videoInfo.result;
        const infoText = `🎬 *YouTube Video Found*\n\n` +
            `📝 *Title:* ${info.title}\n` +
            `⏱️ *Duration:* ${info.durationFormatted}\n` +
            `📺 *Channel:* ${info.channelId}\n` +
            `👀 *Views:* ${info.viewCount ? info.viewCount.toLocaleString() : 'N/A'}\n` +
            `👍 *Likes:* ${info.likeCount ? info.likeCount.toLocaleString() : 'N/A'}\n` +
            `🆔 *Video ID:* ${info.videoId}\n` +
            `📝 *Description:* ${info.shortDescription.substring(0, 200)}${info.shortDescription.length > 200 ? '...' : ''}`;

        await botBaileys.sendText(phoneNumber, infoText);

        // Send thumbnail
        if (info.thumbnail) {
            try {
                const thumbnailPath = createTempFilePath('jpg');
                await downloadImage(info.thumbnail, thumbnailPath);
                await botBaileys.sendMedia(phoneNumber, thumbnailPath, '🖼️ Video Thumbnail');
                cleanupTempFile(thumbnailPath);
            } catch (error) {
                console.error('Error downloading thumbnail:', error);
            }
        }

        // Get related videos
        const relatedVideos = (await getRelatedVideos(info.videoId)).result || [];

        // Store context and set state
        session.youtubeContext = { videoInfo: info, relatedVideos };
        session.awaitingYouTubeAction = true;
        session.awaitingYouTubeQuery = false;
        session.lastActivity = Date.now();

        // Send interactive options
        const optionsText = `\n\n🎯 *Choose an action:*\n\n` +
            `Reply with:\n` +
            `🎵 *mp3* - Download Audio\n` +
            `🎬 *mp4* - Download Video\n` +
            `🔗 *related* - Show Related Videos\n` +
            `🖼️ *thumbnail* - Extract Thumbnail\n` +
            `❌ *cancel* - Cancel Operation`;

        await botBaileys.sendText(phoneNumber, optionsText);
    } catch (error) {
        console.error('YouTube search error:', error);
        resetUserSession(phoneNumber);
        await botBaileys.sendText(phoneNumber, '❌ Error searching YouTube. Please try again.');
    }
};

const extractThumbnail = async (phoneNumber, videoInfo) => {
    try {
        await botBaileys.sendText(phoneNumber, '🖼️ Extracting thumbnail...');
        if (!videoInfo.thumbnail) {
            return await botBaileys.sendText(phoneNumber, '❌ No thumbnail available for this video.');
        }

        const thumbnailPath = createTempFilePath('jpg');
        await downloadImage(videoInfo.thumbnail, thumbnailPath);
        await botBaileys.sendMedia(phoneNumber, thumbnailPath,
            `🖼️ *Thumbnail Extracted*\n\n📝 *Title:* ${videoInfo.title}\n📺 *Channel:* ${videoInfo.channelId}`);
        cleanupTempFile(thumbnailPath);

        // Reset session after successful operation
        resetUserSession(phoneNumber);
        await botBaileys.sendText(phoneNumber, '✅ Operation completed. Type "youtube" to search for another video.');
    } catch (error) {
        console.error('Thumbnail extraction error:', error);
        await botBaileys.sendText(phoneNumber, '❌ Error extracting thumbnail. Please try again.');
    }
};

const downloadYouTubeAudio = async (phoneNumber, videoInfo) => {
    try {
        await botBaileys.sendText(phoneNumber, '🎵 Downloading audio... Please wait.');
        const audioResult = await getYoutubeMP3(`https://www.youtube.com/watch?v=${videoInfo.videoId}`);

        if (audioResult.error) {
            return await botBaileys.sendText(phoneNumber, `❌ Error downloading audio: ${audioResult.error}`);
        }

        const tempFilePath = createTempFilePath('mp3');
        fs.writeFileSync(tempFilePath, audioResult.result);
        await botBaileys.sendFile(phoneNumber, tempFilePath);
        await botBaileys.sendText(phoneNumber, `🎵 *${videoInfo.title}*\n✅ Audio downloaded successfully!`);
        cleanupTempFile(tempFilePath);

        // Reset session after successful operation
        resetUserSession(phoneNumber);
        await botBaileys.sendText(phoneNumber, '✅ Operation completed. Type "youtube" to search for another video.');
    } catch (error) {
        console.error('Audio download error:', error);
        await botBaileys.sendText(phoneNumber, '❌ Error downloading audio. Please try again.');
    }
};

const downloadYouTubeVideo = async (phoneNumber, videoInfo) => {
    try {
        await botBaileys.sendText(phoneNumber, '🎬 Downloading video... Please wait (this may take a while).');
        const progressCallback = (progress) => console.log(`Download progress: ${progress}`);
        const videoResult = await getYoutubeMP4(`https://www.youtube.com/watch?v=${videoInfo.videoId}`, progressCallback);

        if (videoResult.error) {
            return await botBaileys.sendText(phoneNumber, `❌ Error downloading video: ${videoResult.error}`);
        }

        const tempFilePath = createTempFilePath('mp4');
        fs.writeFileSync(tempFilePath, videoResult.result);
        const fileSizeMB = fs.statSync(tempFilePath).size / (1024 * 1024);

        if (fileSizeMB > 64) {
            await botBaileys.sendText(phoneNumber,
                `❌ Video is too large (${fileSizeMB.toFixed(1)}MB). WhatsApp limit is 64MB.\n\n` +
                `Would you like to download as audio instead? Reply with "mp3" or "cancel".`);
            cleanupTempFile(tempFilePath);
            return;
        }

        await botBaileys.sendVideo(phoneNumber, tempFilePath, `🎬 *${videoInfo.title}*\n✅ Video downloaded successfully!`);
        cleanupTempFile(tempFilePath);

        // Reset session after successful operation
        resetUserSession(phoneNumber);
        await botBaileys.sendText(phoneNumber, '✅ Operation completed. Type "youtube" to search for another video.');
    } catch (error) {
        console.error('Video download error:', error);
        await botBaileys.sendText(phoneNumber, '❌ Error downloading video. Please try again.');
    }
};

const showRelatedVideos = async (phoneNumber, relatedVideos) => {
    try {
        if (!relatedVideos || relatedVideos.length === 0) {
            return await botBaileys.sendText(phoneNumber, '❌ No related videos found.');
        }

        const session = getUserSession(phoneNumber);
        session.awaitingRelatedSelection = true;
        session.awaitingYouTubeAction = false;
        session.lastActivity = Date.now();

        const relatedVideosText = relatedVideos
            .slice(0, 5)
            .map((video, index) =>
                `*${index + 1}.* ${video.title}\n` +
                `   ⏱️ Duration: ${video.durationFormatted}\n` +
                `   📺 Channel: ${video.channelId}\n` +
                `   🆔 Video ID: ${video.videoId}`
            )
            .join('\n\n');

        await botBaileys.sendText(phoneNumber,
            `🔗 *Related Videos:*\n\n${relatedVideosText}\n\n` +
            `📱 *Reply with:*\n` +
            `• A number (1-5) to select a video\n` +
            `• "back" to return to previous video\n` +
            `• "cancel" to exit`);
    } catch (error) {
        console.error('Error showing related videos:', error);
        await botBaileys.sendText(phoneNumber, '❌ Error retrieving related videos. Please try again.');
    }
};

const handleRelatedVideoSelection = async (phoneNumber, selection) => {
    try {
        const session = getUserSession(phoneNumber);

        if (selection.toLowerCase() === 'cancel') {
            resetUserSession(phoneNumber);
            return await botBaileys.sendText(phoneNumber, '❌ Operation cancelled.');
        }

        if (selection.toLowerCase() === 'back') {
            session.awaitingRelatedSelection = false;
            session.awaitingYouTubeAction = true;
            session.lastActivity = Date.now();

            const optionsText = `🎯 *Choose an action:*\n\n` +
                `Reply with:\n` +
                `🎵 *mp3* - Download Audio\n` +
                `🎬 *mp4* - Download Video\n` +
                `🔗 *related* - Show Related Videos\n` +
                `🖼️ *thumbnail* - Extract Thumbnail\n` +
                `❌ *cancel* - Cancel Operation`;

            return await botBaileys.sendText(phoneNumber, optionsText);
        }

        const videoIndex = parseInt(selection) - 1;
        if (isNaN(videoIndex) || videoIndex < 0 || videoIndex >= session.youtubeContext.relatedVideos.length) {
            return await botBaileys.sendText(phoneNumber,
                '❌ Invalid selection. Please reply with a number between 1-5, "back", or "cancel".');
        }

        const selectedVideo = session.youtubeContext.relatedVideos[videoIndex];

        // Get full video info for the selected video
        await botBaileys.sendText(phoneNumber, '🔍 Loading selected video...');
        const videoInfo = await getYoutubeVideoInfo(selectedVideo.videoId);

        if (videoInfo.error) {
            return await botBaileys.sendText(phoneNumber, `❌ Error loading video: ${videoInfo.error}`);
        }

        // Update session with new video
        session.youtubeContext.videoInfo = videoInfo.result;
        session.awaitingRelatedSelection = false;
        session.awaitingYouTubeAction = true;
        session.lastActivity = Date.now();

        const info = videoInfo.result;
        const infoText = `🎬 *Selected Video*\n\n` +
            `📝 *Title:* ${info.title}\n` +
            `⏱️ *Duration:* ${info.durationFormatted}\n` +
            `📺 *Channel:* ${info.channelId}\n` +
            `👀 *Views:* ${info.viewCount ? info.viewCount.toLocaleString() : 'N/A'}\n` +
            `👍 *Likes:* ${info.likeCount ? info.likeCount.toLocaleString() : 'N/A'}`;

        await botBaileys.sendText(phoneNumber, infoText);

        // Send thumbnail if available
        if (info.thumbnail) {
            try {
                const thumbnailPath = createTempFilePath('jpg');
                await downloadImage(info.thumbnail, thumbnailPath);
                await botBaileys.sendMedia(phoneNumber, thumbnailPath, '🖼️ Video Thumbnail');
                cleanupTempFile(thumbnailPath);
            } catch (error) {
                console.error('Error downloading thumbnail:', error);
            }
        }

        // Send action options
        const optionsText = `\n🎯 *Choose an action:*\n\n` +
            `Reply with:\n` +
            `🎵 *mp3* - Download Audio\n` +
            `🎬 *mp4* - Download Video\n` +
            `🔗 *related* - Show Related Videos\n` +
            `🖼️ *thumbnail* - Extract Thumbnail\n` +
            `❌ *cancel* - Cancel Operation`;

        await botBaileys.sendText(phoneNumber, optionsText);
    } catch (error) {
        console.error('Error handling related video selection:', error);
        await botBaileys.sendText(phoneNumber, '❌ Error processing selection. Please try again.');
    }
};



// Generic League Functions
async function loadLeagueData(league: string): Promise<boolean> {
    try {
        let csvPath: string;

        switch (league) {
            case 'epl':
                if (eplDataLoaded) return true;
                csvPath = path.join(__dirname, 'epl.csv'); // EPL data
                break;
            case 'laliga':
                if (laligaDataLoaded) return true;
                csvPath = path.join(__dirname, 'epl.csv'); // La Liga data
                break;
            case 'seriea':
                if (serieaDataLoaded) return true;
                csvPath = path.join(__dirname, 'epl.csv'); // Serie A data
                break;
            default:
                return false;
        }

        console.log(`Loading ${league.toUpperCase()} data...`);
        const csvData = await fsPromises.readFile(csvPath, { encoding: 'utf8' });

        const data = parseCSV(csvData);
        const teams = getUniqueTeams(data);

        // Store data based on league
        switch (league) {
            case 'epl':
                eplData = data;
                eplTeams = teams;
                eplDataLoaded = true;
                break;
            case 'laliga':
                laligaData = data;
                laligaTeams = teams;
                laligaDataLoaded = true;
                break;
            case 'seriea':
                serieaData = data;
                serieaTeams = teams;
                serieaDataLoaded = true;
                break;
        }

        console.log(`${league.toUpperCase()} Data loaded successfully!`);
        return true;
    } catch (error: any) {
        console.error(`Error loading ${league} data:`, error.message);
        return false;
    }
}

function parseCSV(csvData: string): MatchData[] {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');

    const data: MatchData[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: MatchData = {} as MatchData;

        headers.forEach((header, index) => {
            row[header.trim()] = values[index] ? values[index].trim() : '';
        });

        // Convert team names to lowercase
        row['HomeTeam'] = row['HomeTeam'].toLowerCase();
        row['AwayTeam'] = row['AwayTeam'].toLowerCase();

        data.push(row);
    }

    return data;
}

function getUniqueTeams(data: MatchData[]): string[] {
    const teams = new Set<string>();
    data.forEach(row => {
        teams.add(row['HomeTeam']);
        teams.add(row['AwayTeam']);
    });
    return Array.from(teams).sort();
}

function getLeagueData(league: string): { data: MatchData[], teams: string[] } {
    switch (league) {
        case 'epl':
            return { data: eplData, teams: eplTeams };
        case 'laliga':
            return { data: laligaData, teams: laligaTeams };
        case 'seriea':
            return { data: serieaData, teams: serieaTeams };
        default:
            return { data: [], teams: [] };
    }
}

interface LeagueInfo {
    name: string;
    emoji: string;
    season: string;
    flag: string;
}

function getLeagueInfo(league: string): LeagueInfo {
    switch (league) {
        case 'epl':
            return {
                name: 'English Premier League',
                emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
                season: '2018/19',
                flag: '⚽'
            };
        case 'laliga':
            return {
                name: 'Spanish La Liga',
                emoji: '🇪🇸',
                season: '2018/19',
                flag: '⚽'
            };
        case 'seriea':
            return {
                name: 'Italian Serie A',
                emoji: '🇮🇹',
                season: '2018/19',
                flag: '⚽'
            };
        default:
            return {
                name: 'Unknown League',
                emoji: '⚽',
                season: 'Unknown',
                flag: '⚽'
            };
    }
}

function calculateLeagueTable(data: MatchData[], teams: string[]): TeamStats[] {
    const table: Record<string, TeamStats> = {};

    // Initialize all teams
    teams.forEach(team => {
        table[team] = {
            team: team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        };
    });

    // Process each match
    data.forEach(match => {
        const homeTeam = match['HomeTeam'];
        const awayTeam = match['AwayTeam'];
        const homeGoals = parseInt(match['FTHG'] || '0');
        const awayGoals = parseInt(match['FTAG'] || '0');

        // Update matches played
        table[homeTeam].played++;
        table[awayTeam].played++;

        // Update goals
        table[homeTeam].goalsFor += homeGoals;
        table[homeTeam].goalsAgainst += awayGoals;
        table[awayTeam].goalsFor += awayGoals;
        table[awayTeam].goalsAgainst += homeGoals;

        // Determine result and update points/wins/draws/losses
        if (homeGoals > awayGoals) {
            table[homeTeam].won++;
            table[homeTeam].points += 3;
            table[awayTeam].lost++;
        } else if (homeGoals < awayGoals) {
            table[awayTeam].won++;
            table[awayTeam].points += 3;
            table[homeTeam].lost++;
        } else {
            table[homeTeam].drawn++;
            table[awayTeam].drawn++;
            table[homeTeam].points++;
            table[awayTeam].points++;
        }
    });

    // Calculate goal difference
    Object.keys(table).forEach(team => {
        table[team].goalDifference = table[team].goalsFor - table[team].goalsAgainst;
    });

    // Convert to array and sort by points
    return Object.values(table).sort((a: TeamStats, b: TeamStats) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
}

function formatLeagueTable(table: TeamStats[], league: string): string {
    const leagueInfo = getLeagueInfo(league);
    let result = `${leagueInfo.emoji} *${leagueInfo.name.toUpperCase()} TABLE ${leagueInfo.season}*\n`;
    result += "```\n";
    result += "Pos | Team              | P  | W  | D  | L  | GF | GA | GD  | Pts\n";
    result += "────┼───────────────────┼────┼────┼────┼────┼────┼────┼─────┼────\n";

    table.forEach((team, index) => {
        const pos = (index + 1).toString().padStart(2, ' ');
        const teamName = team.team.charAt(0).toUpperCase() + team.team.slice(1);
        const formattedTeam = teamName.padEnd(17, ' ');
        const played = team.played.toString().padStart(2, ' ');
        const won = team.won.toString().padStart(2, ' ');
        const drawn = team.drawn.toString().padStart(2, ' ');
        const lost = team.lost.toString().padStart(2, ' ');
        const gf = team.goalsFor.toString().padStart(2, ' ');
        const ga = team.goalsAgainst.toString().padStart(2, ' ');
        const gd = team.goalDifference.toString().padStart(3, ' ');
        const pts = team.points.toString().padStart(3, ' ');

        result += `${pos}  | ${formattedTeam} | ${played} | ${won} | ${drawn} | ${lost} | ${gf} | ${ga} | ${gd} | ${pts}\n`;
    });

    result += "```\n";
    result += "_P=Played, W=Won, D=Drawn, L=Lost, GF=Goals For, GA=Goals Against, GD=Goal Difference_";

    return result;
}

function listAllTeams(teams: string[], league: string): string {
    const leagueInfo = getLeagueInfo(league);
    let result = `${leagueInfo.emoji} *ALL ${leagueInfo.name.toUpperCase()} TEAMS (${leagueInfo.season})*\n\n`;

    const halfwayPoint = Math.ceil(teams.length / 2);
    const firstHalf = teams.slice(0, halfwayPoint);
    const secondHalf = teams.slice(halfwayPoint);

    for (let i = 0; i < firstHalf.length; i++) {
        const team1 = firstHalf[i].charAt(0).toUpperCase() + firstHalf[i].slice(1);
        const team2 = secondHalf[i] ? secondHalf[i].charAt(0).toUpperCase() + secondHalf[i].slice(1) : '';

        const number1 = (i + 1).toString().padStart(2, ' ');
        const number2 = secondHalf[i] ? (i + halfwayPoint + 1).toString().padStart(2, ' ') : '';

        result += `${number1}. ${team1.padEnd(15, ' ')}`;
        if (team2) {
            result += ` ${number2}. ${team2}`;
        }
        result += '\n';
    }

    result += `\n📊 *Total: ${teams.length} teams*`;
    return result;
}

function findTeamsInMessage(message: string, teams: string[]): string[] {
    const foundTeams: string[] = [];
    teams.forEach(team => {
        if (message.includes(team)) {
            foundTeams.push(team);
        }
    });
    return foundTeams;
}

async function processLeagueMessage(sender: string, message: string, league: string): Promise<void> {
    const { data, teams } = getLeagueData(league);
    const leagueInfo = getLeagueInfo(league);

    if (!data.length) {
        const loaded = await loadLeagueData(league);
        if (!loaded) {
            await botBaileys.sendText(sender, `❌ Sorry, ${leagueInfo.name} data could not be loaded. Please try again later.`);
            return;
        }
        // Refresh data after loading
        const refreshedData = getLeagueData(league);
        data.splice(0, data.length, ...refreshedData.data);
        teams.splice(0, teams.length, ...refreshedData.teams);
    }

    const msg = message.trim().toLowerCase();

    // Handle initial league greeting
    if (msg === 'hello' || msg === league || msg === 'help') {
        await botBaileys.sendText(sender,
            `${leagueInfo.emoji} *Welcome to the ${leagueInfo.name} ${leagueInfo.season} Bot!*\n\n` +
            "You can ask questions like:\n\n" +
            "📊 *Match Statistics:*\n" +
            `• How many matches did ${league === 'epl' ? 'Liverpool' : league === 'laliga' ? 'Barcelona' : 'Juventus'} play?\n` +
            `• How many goals did ${league === 'epl' ? 'Arsenal' : league === 'laliga' ? 'Real Madrid' : 'AC Milan'} score?\n` +
            `• How many goals did ${league === 'epl' ? 'Brighton' : league === 'laliga' ? 'Valencia' : 'Napoli'} score away from home?\n` +
            `• How many shots did ${league === 'epl' ? 'West Ham' : league === 'laliga' ? 'Sevilla' : 'Roma'} concede?\n\n` +
            "🏆 *Match Results:*\n" +
            `• What was the result of ${league === 'epl' ? 'Chelsea vs Everton' : league === 'laliga' ? 'Barcelona vs Real Madrid' : 'Juventus vs Inter'}?\n\n` +
            "📋 *Tables & Lists:*\n" +
            "• Show table (displays the league table)\n" +
            "• List teams (shows all team names)\n\n" +
            "❌ Type 'cancel' to exit league mode"
        );
        return;
    }

    if (msg === 'cancel' || msg === 'exit' || msg === 'quit') {
        resetUserSession(sender);
        await botBaileys.sendText(sender, `❌ ${leagueInfo.name} mode cancelled. You can now use other bot commands.`);
        return;
    }

    if (msg.includes('table') || msg.includes('standings') || msg.includes('league table')) {
        const table = calculateLeagueTable(data, teams);
        const formattedTable = formatLeagueTable(table, league);
        await botBaileys.sendText(sender, formattedTable);
        return;
    }

    if (msg.includes('list teams') || msg.includes('show teams') || msg.includes('teams list') || msg.includes('teams')) {
        const teamsList = listAllTeams(teams, league);
        await botBaileys.sendText(sender, teamsList);
        return;
    }

    // Find teams mentioned in the message
    const foundTeams = findTeamsInMessage(msg, teams);

    if (foundTeams.length === 0) {
        await botBaileys.sendText(sender,
            "❌ Sorry, we couldn't recognise any teams in your question.\n\n" +
            "💡 Type 'list teams' to see all available team names.\n" +
            "📝 Or type 'help' to see example questions."
        );
        return;
    }

    if (msg.includes('matches') || msg.includes('played')) {
        const matchCount = data.filter(row =>
            row['HomeTeam'] === foundTeams[0] || row['AwayTeam'] === foundTeams[0]
        ).length;

        const teamName = foundTeams[0].charAt(0).toUpperCase() + foundTeams[0].slice(1);
        await botBaileys.sendText(sender, `${leagueInfo.flag} *${teamName}* played *${matchCount} matches* in the ${leagueInfo.season} season.`);
        return;
    }

    if (msg.includes('goals')) {
        let result = 0;
        let reply = '';
        const teamName = foundTeams[0].charAt(0).toUpperCase() + foundTeams[0].slice(1);

        if (msg.includes('away')) {
            result = data
                .filter(row => row['AwayTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['FTAG'] || '0'), 0);
            reply = `${leagueInfo.flag} *${teamName}* scored *${result} goals* away from home.`;
        } else if (msg.includes('home')) {
            result = data
                .filter(row => row['HomeTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['FTHG'] || '0'), 0);
            reply = `🏠 *${teamName}* scored *${result} goals* at home.`;
        } else {
            const homeGoals = data
                .filter(row => row['HomeTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['FTHG'] || '0'), 0);
            const awayGoals = data
                .filter(row => row['AwayTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['FTAG'] || '0'), 0);
            result = homeGoals + awayGoals;
            reply = `${leagueInfo.flag} *${teamName}* scored *${result} goals* overall (${homeGoals} home, ${awayGoals} away).`;
        }

        await botBaileys.sendText(sender, reply);
        return;
    }

    if (msg.includes('shots')) {
        let result = 0;
        let reply = '';
        const teamName = foundTeams[0].charAt(0).toUpperCase() + foundTeams[0].slice(1);

        if (msg.includes('concede')) {
            const awayShots = data
                .filter(row => row['AwayTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['HS'] || '0'), 0);
            const homeShots = data
                .filter(row => row['HomeTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['AS'] || '0'), 0);
            result = awayShots + homeShots;
            reply = `🎯 *${teamName}* conceded *${result} shots* in total.`;
        } else {
            const homeShots = data
                .filter(row => row['HomeTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['HS'] || '0'), 0);
            const awayShots = data
                .filter(row => row['AwayTeam'] === foundTeams[0])
                .reduce((sum, row) => sum + parseInt(row['AS'] || '0'), 0);
            result = homeShots + awayShots;
            reply = `🎯 *${teamName}* had *${result} shots* in total.`;
        }

        await botBaileys.sendText(sender, reply);
        return;
    }

    if (foundTeams.length === 2) {
        const matches = data.filter(row =>
            (row['HomeTeam'] === foundTeams[0] && row['AwayTeam'] === foundTeams[1]) ||
            (row['HomeTeam'] === foundTeams[1] && row['AwayTeam'] === foundTeams[0])
        );

        if (matches.length > 0) {
            let result = '';

            matches.forEach((match, index) => {
                const homeTeam = match['HomeTeam'].charAt(0).toUpperCase() + match['HomeTeam'].slice(1);
                const awayTeam = match['AwayTeam'].charAt(0).toUpperCase() + match['AwayTeam'].slice(1);

                const roundLabel = matches.length > 1 ? `*${index === 0 ? 'First' : 'Second'} Fixture:*\n` : '';

                result += `${roundLabel}🏟️ *${homeTeam} ${match['FTHG']} - ${match['FTAG']} ${awayTeam}*\n` +
                         `📅 Date: ${match['Date']}\n` +
                         `👨‍⚖️ Referee: ${match['Referee']}\n` +
                         `🎯 Shots: ${match['HS']} - ${match['AS']}\n` +
                         `🚩 Corners: ${match['HC']} - ${match['AC']}\n` +
                         `🟨 Yellow cards: ${match['HY']} - ${match['AY']}\n` +
                         `🟥 Red cards: ${match['HR']} - ${match['AR']}`;

                if (index < matches.length - 1) {
                    result += '\n\n';
                }
            });

            await botBaileys.sendText(sender, result);
        } else {
            const team1 = foundTeams[0].charAt(0).toUpperCase() + foundTeams[0].slice(1);
            const team2 = foundTeams[1].charAt(0).toUpperCase() + foundTeams[1].slice(1);
            await botBaileys.sendText(sender, `❌ No matches found between *${team1}* and *${team2}*.`);
        }
        return;
    }

    await botBaileys.sendText(sender,
        "❓ I'm sorry but I don't understand your question.\n\n" +
        "💡 Type 'help' to see example questions you can ask."
    );
}



// HTTP/HTTPS request function to fetch CSV from URL
const fetchCSVFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : require('http');
        
        client.get(url, (response: any) => {
            let data = '';
            
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return fetchCSVFromURL(response.headers.location).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.on('data', (chunk: any) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (error: any) => {
            reject(error);
        });
    });
};

// Generic CSV Parser Function
function parseLeagueCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const row: any = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    return data;
}

// Updated League Data Loader to fetch from URLs
const loadLeagueAnalysisData = async (league: string): Promise<boolean> => {
    try {
        const url = LEAGUE_URLS[league as keyof typeof LEAGUE_URLS];
        if (!url) {
            console.log(`❌ No URL configured for league: ${league}`);
            return false;
        }

        console.log(`🔄 Fetching ${league.toUpperCase()} data from URL...`);
        
        const csvText = await fetchCSVFromURL(url);
        console.log(`✅ ${league.toUpperCase()} CSV fetched successfully, length:`, csvText.length);
        
        const parsedData = parseLeagueCSV(csvText);
        
        // Assign to appropriate variable based on league
        switch (league.toLowerCase()) {
            case 'seriea':
                serieAAnalysisData = parsedData;
                serieAAnalysisDataLoaded = true;
                break;
            case 'epl':
                eplAnalysisData = parsedData;
                eplAnalysisDataLoaded = true;
                break;
            case 'laliga':
                laligaAnalysisData = parsedData;
                laligaAnalysisDataLoaded = true;
                break;
            case 'bundesliga':
                bundesligaAnalysisData = parsedData;
                bundesligaAnalysisDataLoaded = true;
                break;
            case 'ligue1':
                ligue1AnalysisData = parsedData;
                ligue1AnalysisDataLoaded = true;
                break;
        }
        
        console.log(`✅ Loaded ${league.toUpperCase()} analysis data for ${parsedData.length} teams`);
        return true;
    } catch (error: any) {
        console.log(`❌ Failed to load ${league.toUpperCase()} analysis data!`);
        console.log('Error:', error.message);
        
        // Set appropriate loaded flag to false
        switch (league.toLowerCase()) {
            case 'seriea':
                serieAAnalysisDataLoaded = false;
                break;
            case 'epl':
                eplAnalysisDataLoaded = false;
                break;
            case 'laliga':
                laligaAnalysisDataLoaded = false;
                break;
            case 'bundesliga':
                bundesligaAnalysisDataLoaded = false;
                break;
            case 'ligue1':
                ligue1AnalysisDataLoaded = false;
                break;
        }
        return false;
    }
};

// Generic Team Matches Function
function getTeamMatches(data: any[], teamName: string): LeagueTeamData | null {
    const teamRow = data.find(row =>
        row.title && row.title.toLowerCase().includes(teamName.toLowerCase())
    );

    if (!teamRow) {
        return null;
    }

    let historyData = teamRow.history;
    if (typeof historyData === 'string') {
        try {
            historyData = historyData.replace(/'/g, '"');
            const matchesList = JSON.parse(historyData);
            
            const matchesWithTeamInfo = matchesList.map((match: any) => ({
                ...match,
                team: teamRow.title,
                team_id: teamRow.id
            }));
            
            return {
                teamName: teamRow.title,
                matches: matchesWithTeamInfo
            };
        } catch (error) {
            console.log('❌ Could not parse history data for', teamName);
            return null;
        }
    }
    return null;
}

// Generic Team Analysis Function
function analyzeTeamMatches(teamData: LeagueTeamData, leagueName: string): string {
    if (!teamData || !teamData.matches || teamData.matches.length === 0) {
        return '❌ No match data available';
    }

    const { teamName, matches } = teamData;
    let analysis = `📊 *${teamName.toUpperCase()} - ${leagueName.toUpperCase()} ANALYSIS*\n`;
    analysis += '='.repeat(50) + '\n\n';

    // Basic info
    const totalMatches = matches.length;
    const homeMatches = matches.filter(m => m.h_a === 'h').length;
    const awayMatches = matches.filter(m => m.h_a === 'a').length;

    analysis += `📈 *Basic Statistics:*\n`;
    analysis += `• Total Matches: ${totalMatches}\n`;
    analysis += `• Home Matches: ${homeMatches}\n`;
    analysis += `• Away Matches: ${awayMatches}\n\n`;

    // Expected Goals Analysis
    const xgValues = matches.map(m => parseFloat(m.xG)).filter(val => !isNaN(val));
    const xgaValues = matches.map(m => parseFloat(m.xGA)).filter(val => !isNaN(val));

    if (xgValues.length > 0 && xgaValues.length > 0) {
        const avgXg = xgValues.reduce((sum, val) => sum + val, 0) / xgValues.length;
        const avgXga = xgaValues.reduce((sum, val) => sum + val, 0) / xgaValues.length;
        const xgDiff = avgXg - avgXga;

        analysis += `⚽ *Expected Goals Analysis:*\n`;
        analysis += `• Average xG: ${avgXg.toFixed(2)}\n`;
        analysis += `• Average xGA: ${avgXga.toFixed(2)}\n`;
        analysis += `• xG Difference: ${xgDiff > 0 ? '+' : ''}${xgDiff.toFixed(2)} ${xgDiff > 0 ? '(Positive)' : '(Negative)'}\n\n`;

        // Performance rating
        if (xgDiff > 0.5) {
            analysis += `📈 *Performance:* Excellent offensive threat\n\n`;
        } else if (xgDiff > 0) {
            analysis += `📊 *Performance:* Good attacking performance\n\n`;
        } else if (xgDiff > -0.5) {
            analysis += `📉 *Performance:* Balanced but room for improvement\n\n`;
        } else {
            analysis += `⚠️ *Performance:* Struggling defensively\n\n`;
        }
    }

    // Home vs Away Performance
    analysis += `🏠 *Home vs Away Performance:*\n`;
    const homeData = matches.filter(m => m.h_a === 'h');
    const awayData = matches.filter(m => m.h_a === 'a');

    if (homeData.length > 0) {
        const homeXg = homeData.map(m => parseFloat(m.xG)).filter(val => !isNaN(val));
        const homeXga = homeData.map(m => parseFloat(m.xGA)).filter(val => !isNaN(val));

        if (homeXg.length > 0 && homeXga.length > 0) {
            const avgHomeXg = homeXg.reduce((sum, val) => sum + val, 0) / homeXg.length;
            const avgHomeXga = homeXga.reduce((sum, val) => sum + val, 0) / homeXga.length;
            analysis += `🏠 Home - xG: ${avgHomeXg.toFixed(2)}, xGA: ${avgHomeXga.toFixed(2)}, Diff: ${(avgHomeXg - avgHomeXga).toFixed(2)}\n`;
        }
    }

    if (awayData.length > 0) {
        const awayXg = awayData.map(m => parseFloat(m.xG)).filter(val => !isNaN(val));
        const awayXga = awayData.map(m => parseFloat(m.xGA)).filter(val => !isNaN(val));

        if (awayXg.length > 0 && awayXga.length > 0) {
            const avgAwayXg = awayXg.reduce((sum, val) => sum + val, 0) / awayXg.length;
            const avgAwayXga = awayXga.reduce((sum, val) => sum + val, 0) / awayXga.length;
            analysis += `✈️ Away - xG: ${avgAwayXg.toFixed(2)}, xGA: ${avgAwayXga.toFixed(2)}, Diff: ${(avgAwayXg - avgAwayXga).toFixed(2)}\n`;
        }
    }

    return analysis;
}

// Generic Recent Matches Function
function showRecentMatches(teamData: LeagueTeamData, n: number = 5): string {
    if (!teamData || !teamData.matches || teamData.matches.length === 0) {
        return '❌ No match data available';
    }

    const { teamName, matches } = teamData;
    let result = `📅 *Last ${n} Matches for ${teamName}:*\n`;
    result += '-'.repeat(30) + '\n\n';

    const recent = matches.slice(-n);

    recent.forEach((match, index) => {
        const venue = match.h_a === 'h' ? '🏠 Home' : '✈️ Away';
        const xgInfo = `xG: ${parseFloat(match.xG || '0').toFixed(2)} - xGA: ${parseFloat(match.xGA || '0').toFixed(2)}`;
        const matchNum = matches.length - n + index + 1;
        const date = match.date ? match.date.substring(0, 10) : `Match ${matchNum}`;
        
        result += `${matchNum}. ${date} | ${venue}\n`;
        result += `   ${xgInfo} | Result: ${match.result || 'N/A'}\n\n`;
    });

    return result;
}

// Generic Teams List Function
function listTeams(data: any[], leagueName: string): string {
    let result = `🏆 *Available ${leagueName.toUpperCase()} Teams:*\n`;
    result += '='.repeat(30) + '\n\n';

    const teams = data.map(row => row.title).filter(title => title);
    teams.sort();

    teams.forEach((team, index) => {
        result += `${(index + 1).toString().padStart(2)}. ${team}\n`;
    });

    result += `\n*Total: ${teams.length} teams*`;
    return result;
}

// Generic Export Function
async function exportTeamDataAsJSON(teamData: LeagueTeamData) {
    if (!teamData || !teamData.matches || teamData.matches.length === 0) {
        return null;
    }

    const { teamName, matches } = teamData;
    const safeTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${safeTeamName}_matches.json`;

    try {
        const jsonContent = JSON.stringify({
            teamName: teamName,
            totalMatches: matches.length,
            exportDate: new Date().toISOString(),
            matches: matches
        }, null, 2);

        fs.writeFileSync(filename, jsonContent);
        return filename;
    } catch (error) {
        console.log(`❌ Error exporting data: ${error.message}`);
        return null;
    }
}

// League-specific Menu Functions
const showLeagueAnalysisMenu = async (sender: string, league: string, leagueName: string, dataLoaded: boolean): Promise<void> => {
    if (!dataLoaded) {
        await botBaileys.sendText(sender,
            `❌ *${leagueName} Analysis Data Not Available*\n\n` +
            `The ${leagueName} analysis data is not loaded.\n` +
            'Please try again later or contact support.\n\n' +
            '❌ Type "cancel" to exit'
        );
        return;
    }

    const getLeagueFlag = (league: string) => {
        switch (league) {
            case 'seriea': return '🇮🇹';
            case 'epl': return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
            case 'laliga': return '🇪🇸';
            case 'bundesliga': return '🇩🇪';
            case 'ligue1': return '🇫🇷';
            default: return '⚽';
        }
    };

    const getExampleTeam = (league: string) => {
        switch (league) {
            case 'seriea': return { analyze: 'Napoli', recent: 'Juventus', export: 'Milan' };
            case 'epl': return { analyze: 'Arsenal', recent: 'Liverpool', export: 'Chelsea' };
            case 'laliga': return { analyze: 'Barcelona', recent: 'Real Madrid', export: 'Atletico' };
            case 'bundesliga': return { analyze: 'Bayern Munich', recent: 'Borussia Dortmund', export: 'RB Leipzig' };
            case 'ligue1': return { analyze: 'PSG', recent: 'Marseille', export: 'Lyon' };
            default: return { analyze: 'Team', recent: 'Team', export: 'Team' };
        }
    };

    const flag = getLeagueFlag(league);
    const examples = getExampleTeam(league);
    
    await botBaileys.sendText(sender,
        `${flag} *${leagueName.toUpperCase()} TEAM ANALYSIS*\n\n` +
        '📊 *Available Options:*\n' +
        '• *teams* - List all available teams\n' +
        '• *analyze [team name]* - Full team analysis\n' +
        '• *recent [team name]* - Show recent matches\n' +
        '• *export [team name]* - Export team data as JSON\n\n' +
        '💡 *Examples:*\n' +
        '• teams\n' +
        `• analyze ${examples.analyze}\n` +
        `• recent ${examples.recent}\n` +
        `• export ${examples.export}\n\n` +
        '🔍 *Team Search Tips:*\n' +
        '• You can use partial names\n' +
        '• Search is case-insensitive\n\n' +
        '❌ Type "cancel" to exit'
    );
};

// Generic League Analysis Message Processor
const processLeagueAnalysisMessage = async (sender: string, message: string, league: string, leagueName: string, data: any[]) => {
    const input = message.toLowerCase().trim();
    
    if (input === 'cancel') {
        resetUserSession(sender);
        await botBaileys.sendText(sender, `❌ ${leagueName} analysis cancelled.`);
        return;
    }

    if (input === 'teams') {
        const teamsList = listTeams(data, leagueName);
        await botBaileys.sendText(sender, teamsList);
        return;
    }

    if (input.startsWith('analyze ')) {
        const teamName = input.replace('analyze ', '').trim();
        if (!teamName) {
            const examples = {
                seriea: 'Napoli', epl: 'Arsenal', laliga: 'Barcelona', 
                bundesliga: 'Bayern Munich', ligue1: 'PSG'
            };
            await botBaileys.sendText(sender, `❌ Please specify a team name. Example: analyze ${examples[league as keyof typeof examples]}`);
            return;
        }

        const teamData = getTeamMatches(data, teamName);
        if (teamData) {
            const analysis = analyzeTeamMatches(teamData, leagueName);
            await botBaileys.sendText(sender, analysis);
        } else {
            await botBaileys.sendText(sender, `❌ Team "${teamName}" not found. Use "teams" to see all available teams.`);
        }
        return;
    }

    if (input.startsWith('recent ')) {
        const teamName = input.replace('recent ', '').trim();
        if (!teamName) {
            const examples = {
                seriea: 'Juventus', epl: 'Liverpool', laliga: 'Real Madrid', 
                bundesliga: 'Borussia Dortmund', ligue1: 'Marseille'
            };
            await botBaileys.sendText(sender, `❌ Please specify a team name. Example: recent ${examples[league as keyof typeof examples]}`);
            return;
        }

        const teamData = getTeamMatches(data, teamName);
        if (teamData) {
            const recentMatches = showRecentMatches(teamData);
            await botBaileys.sendText(sender, recentMatches);
        } else {
            await botBaileys.sendText(sender, `❌ Team "${teamName}" not found. Use "teams" to see all available teams.`);
        }
        return;
    }

    if (input.startsWith('export ')) {
        const teamName = input.replace('export ', '').trim();
        if (!teamName) {
            const examples = {
                seriea: 'Milan', epl: 'Chelsea', laliga: 'Atletico', 
                bundesliga: 'RB Leipzig', ligue1: 'Lyon'
            };
            await botBaileys.sendText(sender, `❌ Please specify a team name. Example: export ${examples[league as keyof typeof examples]}`);
            return;
        }

        const teamData = getTeamMatches(data, teamName);
        if (teamData) {
            await botBaileys.sendText(sender, '⏳ Exporting team data...');

            const filename = await exportTeamDataAsJSON(teamData);
            if (filename) {
                try {
                    await botBaileys.sendFile(sender, filename);
                    await botBaileys.sendText(sender, `✅ ${teamData.teamName} match data exported successfully!`);
                    
                    // Clean up the file after sending
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(filename);
                        } catch (error) {
                            console.log(`Warning: Could not delete temporary file ${filename}`);
                        }
                    }, 5000);
                } catch (error) {
                    await botBaileys.sendText(sender, '❌ Failed to send the exported file. Please try again.');
                }
            } else {
                await botBaileys.sendText(sender, '❌ Failed to export team data.');
            }
        } else {
            await botBaileys.sendText(sender, `❌ Team "${teamName}" not found. Use "teams" to see all available teams.`);
        }
        return;
    }

    // Invalid command
    const examples = {
        seriea: 'Napoli', epl: 'Arsenal', laliga: 'Barcelona', 
        bundesliga: 'Bayern Munich', ligue1: 'PSG'
    };
    
    await botBaileys.sendText(sender,
        '❌ Invalid command. Available commands:\n\n' +
        '• *teams* - List all teams\n' +
        '• *analyze [team name]* - Team analysis\n' +
        '• *recent [team name]* - Recent matches\n' +
        '• *export [team name]* - Export data\n' +
        '• *cancel* - Exit\n\n' +
        `Example: analyze ${examples[league as keyof typeof examples]}`
    );
};




// Modified Command Handlers
const handleCommand = async (message: any, command: string, args: string[]): Promise<void> => {
    const sender = message.from;
    const session = getUserSession(sender);
    switch (command) {
        // Basic Bot Commands
        case 'text':
            await botBaileys.sendText(sender, 'Hello world! 👋');
            break;
        case 'media':
            await botBaileys.sendMedia(sender, 'https://www.w3schools.com/w3css/img_lights.jpg', 'Hello world! 📷');
            break;
        case 'file':
            await botBaileys.sendFile(sender, 'https://github.com/pedrazadixon/sample-files/raw/main/sample_pdf.pdf');
            break;
        case 'sticker':
            await botBaileys.sendSticker(sender, 'https://gifimgs.com/animations/anime/dragon-ball-z/Goku/goku_34.gif', { pack: 'User', author: 'Me' });
            break;

        // Football League Commands
        case 'epl':
        case 'premier':
        case 'league':
            resetUserSession(sender);
            session.awaitingEPLQuery = true;
            session.currentLeague = 'epl';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'epl');
            break;

        case 'laliga':
        case 'liga':
        case 'spanish':
            resetUserSession(sender);
            session.awaitingLaLigaQuery = true;
            session.currentLeague = 'laliga';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'laliga');
            break;

        case 'seriea':
        case 'seria':
        case 'italian':
            resetUserSession(sender);
            session.awaitingSerieAQuery = true;
            session.currentLeague = 'seriea';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'seriea');
            break;

        case 'football':
        case 'soccer':
            resetUserSession(sender);
            await showFootballMenu(sender);
            break;

        // League Analysis Commands
        case 'serieanalysis':
        case 'saanalysis':
        case 'analysis':
            resetUserSession(sender);
            session.awaitingSerieAAnalysis = true;
            session.lastActivity = Date.now();
            await showLeagueAnalysisMenu(sender, 'serie_a', 'Serie A', serieAAnalysisDataLoaded);
            break;

        case 'eplanalysis':
        case 'premieranalysis':
        case 'planalysis':
            resetUserSession(sender);
            session.awaitingEPLAnalysis = true;
            session.lastActivity = Date.now();
            await showLeagueAnalysisMenu(sender, 'epl', 'Premier League', eplAnalysisDataLoaded);
            break;

        case 'laligaanalysis':
        case 'ligaanalysis':
        case 'spanishanalysis':
            resetUserSession(sender);
            session.awaitingLaLigaAnalysis = true;
            session.lastActivity = Date.now();
            await showLeagueAnalysisMenu(sender, 'laliga', 'La Liga', laligaAnalysisDataLoaded);
            break;

        case 'bundesligaanalysis':
        case 'germananalysis':
        case 'bundanalysis':
            resetUserSession(sender);
            session.awaitingBundesligaAnalysis = true;
            session.lastActivity = Date.now();
            await showLeagueAnalysisMenu(sender, 'bundesliga', 'Bundesliga', bundesligaAnalysisDataLoaded);
            break;

        case 'ligue1analysis':
        case 'frenchanalysis':
        case 'l1analysis':
            resetUserSession(sender);
            session.awaitingLigue1Analysis = true;
            session.lastActivity = Date.now();
            await showLeagueAnalysisMenu(sender, 'ligue1', 'Ligue 1', ligue1AnalysisDataLoaded);
            break;

        // Chess Commands
        case 'chess':
            await startChessGame(sender);
            break;

        case 'graph':
            await startGraphingCalculator(sender);
            break;


        // YouTube Commands
        case 'youtube':
            resetUserSession(sender);
            session.awaitingYouTubeQuery = true;
            session.lastActivity = Date.now();
            await botBaileys.sendText(sender,
                '🎵 *YouTube Search*\n\n' +
                '🔍 Please send your search query.\n\n' +
                '📝 Examples:\n' +
                '• Imagine Dragons Bones\n' +
                '• How to cook pasta\n' +
                '• JavaScript tutorial\n\n' +
                '❌ Type "cancel" to abort.'
            );
            break;
        case 'mp3':
            if (session.youtubeContext?.videoInfo) {
                await downloadYouTubeAudio(sender, session.youtubeContext.videoInfo);
            } else {
                await botBaileys.sendText(sender, '❌ No video selected. Use .youtube first to search for a video.');
            }
            break;
        case 'mp4':
            if (session.youtubeContext?.videoInfo) {
                await downloadYouTubeVideo(sender, session.youtubeContext.videoInfo);
            } else {
                await botBaileys.sendText(sender, '❌ No video selected. Use .youtube first to search for a video.');
            }
            break;
        case 'related':
            if (session.youtubeContext?.relatedVideos) {
                await showRelatedVideos(sender, session.youtubeContext.relatedVideos);
            } else {
                await botBaileys.sendText(sender, '❌ No related videos available. Search for a video first.');
            }
            break;
        case 'thumbnail':
            if (session.youtubeContext?.videoInfo) {
                await extractThumbnail(sender, session.youtubeContext.videoInfo);
            } else {
                await botBaileys.sendText(sender, '❌ No video selected. Use .youtube first to search for a video.');
            }
            break;

        // RPG Game Commands
        case 'game':
            await handleGameMenu(message);
            break;
        case 'profile':
            await handleProfile(message);
            break;
        case 'inventory':
            await handleInventory(message);
            break;
        case 'blacksmith':
            await handleBlacksmith(message, args);
            break;
        case 'createsword':
            await handleBlacksmith(message, ['createsword', ...args]);
            break;
        case 'createarmor':
            await handleBlacksmith(message, ['createarmor', ...args]);
            break;
        case 'createpickaxe':
            await handleBlacksmith(message, ['createpickaxe', ...args]);
            break;
        case 'createfishingrod':
            await handleBlacksmith(message, ['createfishingrod', ...args]);
            break;
        case 'shop':
            await handleShop(message, args);
            break;
        case 'buy':
            await handleShop(message, ['buy', ...args]);
            break;
        case 'sell':
            await handleShop(message, ['sell', ...args]);
            break;
        case 'open':
            await handleOpen(message, args);
            break;
        case 'heal':
            await handleHeal(message, args);
            break;
        case 'fishing':
            await handleFishing(message);
            break;
        case 'pet':
            await handlePet(message, args);
            break;
        case 'adventure':
            await handleAdventureCommand(message, args);
            break;

        // Utility Commands
        case 'cancel':
            resetUserSession(sender);
            await botBaileys.sendText(sender, '❌ Operation cancelled.');
            break;

        default:
            await botBaileys.sendText(sender,
                '❌ Unknown command. Available commands:\n\n' +
                '**🤖 Basic Commands:**\n' +
                '• text, media, file, sticker\n\n' +
                '**⚽ Football Commands:**\n' +
                '• football - Show league menu\n' +
                '• epl - Premier League 2018/19\n' +
                '• laliga - Spanish La Liga 2018/19\n' +
                '• seriea - Italian Serie A 2018/19\n\n' +
                '**🎵 YouTube Commands:**\n' +
                '• youtube <search term>\n' +
                '• mp3, mp4, related, thumbnail\n\n' +
                '**🎮 RPG Game Commands:**\n' +
                '• game - Show game menu\n' +
                '• profile, inventory, adventure\n' +
                '• blacksmith, shop, fishing, pet\n\n' +
                '**🔧 Utility:**\n' +
                '• cancel - Cancel current operation'
            );
            break;
    }
};

// New Football Menu Function
const showFootballMenu = async (sender: string): Promise<void> => {
    await botBaileys.sendText(sender,
        '⚽ *FOOTBALL LEAGUES MENU*\n\n' +
        '🏴󠁧󠁢󠁥󠁮󠁧󠁿 **English Premier League (2018/19)**\n' +
        '• .epl or .premier or .league\n\n' +
        '🇪🇸 **Spanish La Liga (2018/19)**\n' +
        '• .laliga or .liga or .spanish\n\n' +
        '🇮🇹 **Italian Serie A (2018/19)**\n' +
        '• .seriea or .seria or .italian\n\n' +
        '📊 *Each league offers:*\n' +
        '• League tables and standings\n' +
        '• Team statistics and match data\n' +
        '• Head-to-head results\n' +
        '• Goals, shots, and card statistics\n\n' +
        '💡 *Example queries:*\n' +
        '• "show table" - League standings\n' +
        '• "list teams" - All team names\n' +
        '• "How many goals did Barcelona score?"\n' +
        '• "Real Madrid vs Barcelona"\n\n' +
        '❌ Type "cancel" to exit'
    );
};

// Main Message Handler
botBaileys.on('message', async (message) => {
    try {
        const sender = message.from;
        const session = getUserSession(sender);
        session.lastActivity = Date.now();

        // Handle button responses first
        if (message.buttonResponseMessage) {
            await handleQuickReply(message);
            return;
        }

        // Handle text-based choice responses
        const textChoiceHandled = await handleTextChoice(message);
        if (textChoiceHandled) {
            return;
        }

        // Handle Football League session states
        if (session.awaitingEPLQuery) {
            await processLeagueMessage(sender, message.body, 'epl');
            return;
        }


        if (session.awaitingLaLigaQuery) {
            await processLeagueMessage(sender, message.body, 'laliga');
            return;
        }

        if (session.awaitingSerieAQuery) {
            await processLeagueMessage(sender, message.body, 'seriea');
            return;
        }


        // Handle Serie A Analysis
        if (session.awaitingSerieAAnalysis) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ Serie A analysis cancelled.');
                return;
            }
            await processLeagueAnalysisMessage(sender, input, 'serie_a', 'Serie A', serieAAnalysisData);
            return;
        }

        // Handle EPL Analysis
        if (session.awaitingEPLAnalysis) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ Premier League analysis cancelled.');
                return;
            }
            await processLeagueAnalysisMessage(sender, input, 'epl', 'Premier League', eplAnalysisData);
            return;
        }

        // Handle La Liga Analysis
        if (session.awaitingLaLigaAnalysis) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ La Liga analysis cancelled.');
                return;
            }
            await processLeagueAnalysisMessage(sender, input, 'laliga', 'La Liga', laligaAnalysisData);
            return;
        }

        // Handle EPL Analysis
        // Handle EPL Analysis
        if (session.awaitingBundesligaAnalysis) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ Premier League analysis cancelled.');
                return;
            }
            await processLeagueAnalysisMessage(sender, input, 'bundesliga', 'Germany League', bundesligaAnalysisData);
            return;
        }

        // Handle EPL Analysis
        if (session.awaitingLigue1Analysis) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ Premier League analysis cancelled.');
                return;
            }
            await processLeagueAnalysisMessage(sender, input, 'ligue1', 'French League', ligue1AnalysisData);
            return;
        }

                // Handle Chess session states
        if (session.awaitingChessMove && session.isChessGameActive) {
            const input = message.body?.trim();
            await handleChessMove(sender, input);
            return;
        }

        // Handle Graphing Calculator session states
        if (session.awaitingGraphInput && session.isGraphCalculatorActive) {
            const input = message.body?.trim();
            await handleGraphingInput(sender, input);
            return;
        }
        


        // Handle YouTube session states
        if (session.awaitingYouTubeQuery) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ YouTube search cancelled.');
                return;
            }
            await handleYouTubeSearch(sender, input);
            return;
        }

        if (session.awaitingRelatedSelection) {
            const input = message.body?.trim();
            if (input?.toLowerCase() === 'cancel') {
                resetUserSession(sender);
                await botBaileys.sendText(sender, '❌ Related video selection cancelled.');
                return;
            }
            await handleRelatedVideoSelection(sender, input);
            return;
        }

        if (session.awaitingYouTubeAction) {
            const action = message.body?.trim().toLowerCase();
            switch (action) {
                case 'mp3':
                    if (session.youtubeContext?.videoInfo) {
                        await downloadYouTubeAudio(sender, session.youtubeContext.videoInfo);
                    }
                    break;
                case 'mp4':
                    if (session.youtubeContext?.videoInfo) {
                        await downloadYouTubeVideo(sender, session.youtubeContext.videoInfo);
                    }
                    break;
                case 'related':
                    if (session.youtubeContext?.relatedVideos) {
                        await showRelatedVideos(sender, session.youtubeContext.relatedVideos);
                    }
                    break;
                case 'thumbnail':
                    if (session.youtubeContext?.videoInfo) {
                        await extractThumbnail(sender, session.youtubeContext.videoInfo);
                    }
                    break;
                case 'cancel':
                    resetUserSession(sender);
                    await botBaileys.sendText(sender, '❌ Operation cancelled.');
                    break;
                default:
                    await botBaileys.sendText(sender,
                        '❌ Invalid option. Please reply with:\n' +
                        '🎵 mp3 | 🎬 mp4 | 🔗 related | 🖼️ thumbnail | ❌ cancel'
                    );
                    break;
            }
            return;
        }

        // Handle regular text commands
        const messageText = message.body?.toLowerCase() || '';
        const input = message.body?.trim().split(' ');
        if (!input || input.length === 0) return;

        // Handle EPL commands
        if (messageText.startsWith('.epl') || messageText.startsWith('epl') ||
            messageText.startsWith('.premier') || messageText.startsWith('premier') ||
            messageText.startsWith('.league') || messageText.startsWith('league')) {
            resetUserSession(sender);
            const session = getUserSession(sender);
            session.awaitingEPLQuery = true;
            session.currentLeague = 'epl';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'epl');
            return;
        }

        // Handle La Liga commands
        if (messageText.startsWith('.laliga') || messageText.startsWith('laliga') ||
            messageText.startsWith('.liga') || messageText.startsWith('liga') ||
            messageText.startsWith('.spanish') || messageText.startsWith('spanish')) {
            resetUserSession(sender);
            const session = getUserSession(sender);
            session.awaitingLaLigaQuery = true;
            session.currentLeague = 'laliga';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'laliga');
            return;
        }

        // Handle Serie A commands
        if (messageText.startsWith('.seriea') || messageText.startsWith('seriea') ||
            messageText.startsWith('.seria') || messageText.startsWith('seria') ||
            messageText.startsWith('.italian') || messageText.startsWith('italian')) {
            resetUserSession(sender);
            const session = getUserSession(sender);
            session.awaitingSerieAQuery = true;
            session.currentLeague = 'seriea';
            session.lastActivity = Date.now();
            await processLeagueMessage(sender, 'hello', 'seriea');
            return;
        }

        // Handle football menu command
        if (messageText.startsWith('.football') || messageText.startsWith('football') ||
            messageText.startsWith('.soccer') || messageText.startsWith('soccer')) {
            resetUserSession(sender);
            await showFootballMenu(sender);
            return;
        }

        

        // Handle adventure commands specifically
        if (messageText.startsWith('.adventure') || messageText.startsWith('adventure')) {
            const adventureArgs = messageText.replace(/^\.?adventure\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleAdventureCommand(message, adventureArgs);
            return;
        }

        // Handle game menu command specifically
        if (messageText.startsWith('.game') || messageText.startsWith('game')) {
            await handleGameMenu(message);
            return;
        }

        // Handle profile command specifically
        if (messageText.startsWith('.profile') || messageText.startsWith('profile')) {
            await handleProfile(message);
            return;
        }

        // Handle inventory command specifically
        if (messageText.startsWith('.inventory') || messageText.startsWith('inventory')) {
            await handleInventory(message);
            return;
        }

        // Handle blacksmith commands specifically
        if (messageText.startsWith('.blacksmith') || messageText.startsWith('blacksmith')) {
            const blacksmithArgs = messageText.replace(/^\.?blacksmith\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleBlacksmith(message, blacksmithArgs);
            return;
        }

        // Handle crafting commands specifically
        if (messageText.match(/^\.?(createsword|createarmor|createpickaxe|createfishingrod)/)) {
            const craftCommand = messageText.match(/^\.?(createsword|createarmor|createpickaxe|createfishingrod)/)?.[1];
            const craftArgs = messageText.replace(/^\.?(createsword|createarmor|createpickaxe|createfishingrod)\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleBlacksmith(message, [craftCommand, ...craftArgs]);
            return;
        }

        // Handle shop commands specifically
        if (messageText.startsWith('.shop') || messageText.startsWith('shop')) {
            const shopArgs = messageText.replace(/^\.?shop\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleShop(message, shopArgs);
            return;
        }

        // Handle buy/sell commands specifically
        if (messageText.match(/^\.?(buy|sell)/)) {
            const tradeCommand = messageText.match(/^\.?(buy|sell)/)?.[1];
            const tradeArgs = messageText.replace(/^\.?(buy|sell)\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleShop(message, [tradeCommand, ...tradeArgs]);
            return;
        }

        // Handle open command specifically
        if (messageText.startsWith('.open') || messageText.startsWith('open')) {
            const openArgs = messageText.replace(/^\.?open\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleOpen(message, openArgs);
            return;
        }

        // Handle heal command specifically
        if (messageText.startsWith('.heal') || messageText.startsWith('heal')) {
            const healArgs = messageText.replace(/^\.?heal\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handleHeal(message, healArgs);
            return;
        }

        // Handle fishing command specifically
        if (messageText.startsWith('.fishing') || messageText.startsWith('fishing')) {
            await handleFishing(message);
            return;
        }

        // Handle pet command specifically
        if (messageText.startsWith('.pet') || messageText.startsWith('pet')) {
            const petArgs = messageText.replace(/^\.?pet\s*/, '').trim().split(' ').filter(arg => arg.length > 0);
            await handlePet(message, petArgs);
            return;
        }

        // Handle YouTube command with search term
        if (messageText.startsWith('.youtube ') || messageText.startsWith('youtube ')) {
            const searchTerm = messageText.replace(/^\.?youtube\s+/, '').trim();
            if (searchTerm) {
                resetUserSession(sender);
                await handleYouTubeSearch(sender, searchTerm);
                return;
            }
        }

        // Handle other commands
        const command = input[0].toLowerCase().replace('.', ''); // Remove dot if present
        const args = input.slice(1);

        await handleCommand(message, command, args);
    } catch (error) {
        console.error('Error processing message:', error);
        await botBaileys.sendText(message.from, '❌ An error occurred. Please try again.');
    }
});


// Load all league data on startup

const loadAllLeagueData = async () => {
    console.log('🔄 Loading all football league data...');
    
    const loadPromises = [
        loadLeagueData('epl'),
        loadLeagueData('laliga'),
        loadLeagueData('seriea')
    ];

    try {
        const results = await Promise.all(loadPromises);
        
        // Handle league data results
        const leagueNames = ['EPL', 'La Liga', 'Serie A'];
        const loadedLeagues = leagueNames.filter((_, index) => results[index]);
        
        if (loadedLeagues.length > 0) {
            console.log(`✅ Successfully loaded leagues: ${loadedLeagues.join(', ')}`);
        }

        const failedLeagues = leagueNames.filter((_, index) => !results[index]);
        if (failedLeagues.length > 0) {
            console.log(`❌ Failed to load leagues: ${failedLeagues.join(', ')}`);
        }

        

    } catch (error) {
        console.error('❌ Error loading data:', error);
    }

    console.log('📊 All data loading completed');
};


// Load all league analysis data on startup
const loadAllLeagueAnalysisData = async () => {
    console.log('🔄 Loading all football league analysis data...');

    const loadPromises = [
        loadLeagueAnalysisData('seriea'),
        loadLeagueAnalysisData('epl'),
        loadLeagueAnalysisData('laliga'),
        loadLeagueAnalysisData('bundesliga'),
        loadLeagueAnalysisData('ligue1')
    ];

    try {
        const results = await Promise.all(loadPromises);

        // Handle analysis data results
        const leagueNames = ['Serie A', 'Premier League', 'La Liga','Bundesliga','Ligue1'];
        const loadedLeagues = leagueNames.filter((_, index) => results[index]);

        if (loadedLeagues.length > 0) {
            console.log(`✅ Successfully loaded analysis for: ${loadedLeagues.join(', ')}`);
        }

        const failedLeagues = leagueNames.filter((_, index) => !results[index]);
        if (failedLeagues.length > 0) {
            console.log(`❌ Failed to load analysis for: ${failedLeagues.join(', ')}`);
        }

    } catch (error) {
        console.error('❌ Error loading analysis data:', error);
    }

    console.log('📊 All analysis data loading completed');
};

// Initialize all league analysis data


// Initialize all league data
loadAllLeagueData();
loadAllLeagueAnalysisData();

