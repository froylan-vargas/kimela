export class QimelaNotFoundError extends Error {
  constructor(id: string) {
    super(`Qimela with id "${id}" not found`);
    this.name = 'QimelaNotFoundError';
  }
}
