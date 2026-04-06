export class KimelaNotFoundError extends Error {
  constructor(id: string) {
    super(`Kimela with id "${id}" not found`);
    this.name = 'KimelaNotFoundError';
  }
}
