// Pure combat logging - no Babylon imports

export interface LogEntry {
  message: string;
  timestamp: number;
  turnNumber?: number;
}

export class CombatLog {
  private entries: LogEntry[] = [];
  private currentTurn: number = 0;

  setTurn(turn: number): void {
    this.currentTurn = turn;
  }

  add(message: string): void {
    this.entries.push({
      message,
      timestamp: Date.now(),
      turnNumber: this.currentTurn,
    });
  }

  addTurnStart(turn: number): void {
    this.currentTurn = turn;
    this.add(`--- Turn ${turn} ---`);
  }

  getAll(): LogEntry[] {
    return [...this.entries];
  }

  getMessages(): string[] {
    return this.entries.map(e => e.message);
  }

  clear(): void {
    this.entries = [];
    this.currentTurn = 0;
  }

  print(): void {
    this.entries.forEach(entry => {
      console.log(entry.message);
    });
  }

  getLastN(count: number): LogEntry[] {
    return this.entries.slice(-count);
  }
}

// Singleton instance for easy access
export const combatLog = new CombatLog();
