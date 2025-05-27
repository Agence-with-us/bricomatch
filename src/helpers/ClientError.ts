// ClientError.ts

export class ClientError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    // Rétablit correctement le prototype pour une bonne instance de la classe
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
