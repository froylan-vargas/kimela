export class QimelaNotFoundError extends Error {
  constructor(id: string) {
    super(`qimela with id "${id}" not found`);
    this.name = "QimelaNotFoundError";
  }
}
