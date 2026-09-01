export interface EnvironmentVariables extends Record<string, unknown> {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SMTP_PORT?: number;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): EnvironmentVariables {
  try {
    const required = [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
    ] as const;
    const missing = required.filter(
      (key) =>
        typeof input[key] !== 'string' ||
        String(input[key]).trim().length < (key.includes('SECRET') ? 16 : 1),
    );
    if (missing.length)
      throw new Error(
        `Biến môi trường thiếu hoặc không hợp lệ: ${missing.join(', ')}`,
      );
    const port = Number(input.DB_PORT ?? 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('DB_PORT không hợp lệ');
    const smtpPort = Number(input.SMTP_PORT ?? 587);
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)
      throw new Error('SMTP_PORT không hợp lệ');
    const validated: EnvironmentVariables = {
      ...input,
      DB_HOST: String(input.DB_HOST),
      DB_PORT: port,
      DB_USERNAME: String(input.DB_USERNAME),
      DB_PASSWORD: String(input.DB_PASSWORD),
      DB_DATABASE: String(input.DB_DATABASE),
      JWT_ACCESS_SECRET: String(input.JWT_ACCESS_SECRET),
      JWT_REFRESH_SECRET: String(input.JWT_REFRESH_SECRET),
      SMTP_PORT: smtpPort,
    };
    return validated;
  } catch (error: unknown) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}
