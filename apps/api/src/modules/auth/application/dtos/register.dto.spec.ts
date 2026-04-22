import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  function makeDto(name: string): RegisterDto {
    return Object.assign(new RegisterDto(), {
      email: 'new@example.com',
      name,
      password: 'Password1!',
    });
  }

  it('accepts names with spaces, periods, underscores, and hyphens', async () => {
    const validNames = ['Laura Gomez', 'froylan.vargas', 'camilo_ramones', 'ana-maria'];

    for (const name of validNames) {
      const errors = await validate(makeDto(name));
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects names with disallowed special characters', async () => {
    const errors = await validate(makeDto('camilo@ramones'));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('name');
  });
});
